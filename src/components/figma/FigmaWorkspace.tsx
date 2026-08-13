import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  FigmaEvent,
  FigmaFileIndexEntry,
  FigmaPrefs,
  FigmaSyncFailure,
  FigmaSyncFailureReason,
  FigmaSyncFailureScope,
  FigmaSyncProgress,
  FigmaTeamRef,
  FigmaUser,
} from '@/types'
import { ipc, BoxUiError } from '@/lib/ipc'
import { Button, Spinner } from '@/components/ui'
import { AppIcon } from '@/components/AppIcon'
import { CheckGlyph, PlusGlyph } from '@/components/Glyphs'
import { cn } from '@/lib/cn'
import { useScrollEdges } from '@/lib/useScrollEdges'
import {
  AnalyticsPrefs,
  DEFAULT_FILTERS,
  DEFAULT_PREFS,
  FigmaFilters,
  TIMELINE_BUCKETS,
  WINDOW_LABEL,
  applyFilters,
  perPersonStats,
} from './analytics'
import { FilterBar } from './FilterBar'
import { FigmaSidebar, type SectionItem } from './FigmaSidebar'
import { CommandPalette, type Command } from './CommandPalette'
import { DashboardSkeleton, EmptyBlock, VizPrefsProvider } from './charts'
import { FigmaFileDetail } from './FigmaFileDetail'
import { DashboardPanel } from './DashboardPanel'
import { InsightsPanel } from './InsightsPanel'
import { TrendsPanel } from './TrendsPanel'
import { PeoplePanel } from './PeoplePanel'
import { ThreadsPanel } from './ThreadsPanel'
import { ActivityPanel } from './ActivityPanel'
import { FilesPanel } from './FilesPanel'
import { LibraryPanel } from './LibraryPanel'
import { SettingsPanel } from './SettingsPanel'

type Section =
  | 'insights'
  | 'dashboard'
  | 'trends'
  | 'people'
  | 'threads'
  | 'activity'
  | 'files'
  | 'library'
  | 'settings'

const SECTIONS: SectionItem<Section>[] = [
  { value: 'insights', label: 'Инсайты', icon: 'Bell', group: 'Обзор' },
  { value: 'dashboard', label: 'Дашборд', icon: 'AlignLeft', group: 'Обзор' },
  { value: 'trends', label: 'Тренды', icon: 'ArrowRight', group: 'Обзор' },
  { value: 'people', label: 'Люди', icon: 'Users', group: 'Разрезы' },
  { value: 'threads', label: 'Обсуждения', icon: 'MessageSquare', group: 'Разрезы' },
  { value: 'files', label: 'Файлы', icon: 'CalendarDays', group: 'Разрезы' },
  { value: 'library', label: 'Библиотека', icon: 'ShieldCheck', group: 'Разрезы' },
  { value: 'activity', label: 'Активность', icon: 'Clock', group: 'Данные' },
  { value: 'settings', label: 'Настройки', icon: 'KeyRound', group: 'Данные' },
]

export function FigmaWorkspace({
  user,
  onDisconnect,
}: {
  /** null — токен сохранён, но профиль ещё не подтверждён (нет сети, лимит API). */
  user: FigmaUser | null
  onDisconnect: () => void
}) {
  const [section, setSection] = useState<Section>('insights')
  const [selectedFile, setSelectedFile] = useState<{ key: string; name: string } | null>(null)
  const [filters, setFilters] = useState<FigmaFilters>(DEFAULT_FILTERS)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const mainScroll = useScrollEdges<HTMLElement>()

  const [teams, setTeams] = useState<FigmaTeamRef[]>([])
  const [events, setEvents] = useState<FigmaEvent[]>([])
  const [files, setFiles] = useState<FigmaFileIndexEntry[]>([])
  const [prefs, setPrefs] = useState<FigmaPrefs | null>(null)
  const [loading, setLoading] = useState(true)
  const [bootstrapped, setBootstrapped] = useState(false)

  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState<FigmaSyncProgress | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncErrorDetails, setSyncErrorDetails] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const [nextTeams, nextEvents, nextFiles, nextPrefs] = await Promise.all([
      ipc.figmaTeamsList(),
      ipc.figmaEvents(),
      ipc.figmaFileIndex(),
      ipc.figmaPrefs(),
    ])
    TIMELINE_BUCKETS.day = nextPrefs.timelineBuckets.day
    TIMELINE_BUCKETS.week = nextPrefs.timelineBuckets.week
    TIMELINE_BUCKETS.month = nextPrefs.timelineBuckets.month
    TIMELINE_BUCKETS.year = nextPrefs.timelineBuckets.year

    setTeams(nextTeams)
    setEvents(nextEvents)
    setFiles(nextFiles)
    setPrefs(nextPrefs)
    setLoading(false)
    // Раздел по умолчанию применяем однократно, иначе любой перезапрос данных
    // выбрасывал бы пользователя обратно на стартовый экран.
    setBootstrapped((already) => {
      if (!already) setSection(nextPrefs.defaultSection as Section)
      return true
    })
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  useEffect(() => ipc.figmaOnSyncProgress(setProgress), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((value) => !value)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Настройки рабочего ритма влияют и на метрики, и на таймлайны — прокидываем
  // их в аналитику вместо зашитых констант.
  const analyticsPrefs: AnalyticsPrefs = useMemo(
    () =>
      prefs
        ? {
            nightStart: prefs.nightStart,
            nightEnd: prefs.nightEnd,
            weekendDays: prefs.weekendDays,
            workdayStart: prefs.workdayStart,
            workdayEnd: prefs.workdayEnd,
          }
        : DEFAULT_PREFS,
    [prefs],
  )

  const runSync = async () => {
    setSyncing(true)
    setSyncError(null)
    setSyncErrorDetails(null)
    try {
      const result = await ipc.figmaSync()
      if (result.errors.length > 0) {
        setSyncError(describeSyncErrors(result.errors))
        setSyncErrorDetails(listSyncErrors(result.errors))
      }
      await reload()
    } catch (error) {
      setSyncError(error instanceof BoxUiError ? error.message : 'Синхронизация не удалась')
    } finally {
      setSyncing(false)
      setProgress(null)
    }
  }

  const scopedEvents = useMemo(
    () => applyFilters(events, filters, analyticsPrefs),
    [events, filters, analyticsPrefs],
  )

  const scopedFiles = useMemo(() => {
    if (filters.teams.length === 0 && filters.projects.length === 0) return files
    const teamSet = new Set(filters.teams)
    const projectSet = new Set(filters.projects)
    return files.filter(
      (file) =>
        (teamSet.size === 0 || teamSet.has(file.teamId)) &&
        (projectSet.size === 0 || projectSet.has(file.projectId)),
    )
  }, [files, filters.teams, filters.projects])

  const openFile = (key: string, name: string) => setSelectedFile({ key, name })

  const savePreset = async (name: string) => {
    const next = [
      ...(prefs?.filterPresets ?? []),
      { id: `${Date.now()}`, name, filters: filters as unknown },
    ]
    setPrefs(await ipc.figmaSetPrefs({ filterPresets: next }))
  }

  const deletePreset = async (id: string) => {
    const next = (prefs?.filterPresets ?? []).filter((item) => item.id !== id)
    setPrefs(await ipc.figmaSetPrefs({ filterPresets: next }))
  }

  const togglePin = async (key: string, name: string) => {
    const current = prefs?.pinnedFiles ?? []
    const next = current.some((item) => item.key === key)
      ? current.filter((item) => item.key !== key)
      : [...current, { key, name }]
    setPrefs(await ipc.figmaSetPrefs({ pinnedFiles: next }))
  }

  const commands: Command[] = useMemo(() => {
    const list: Command[] = SECTIONS.map((item) => ({
      id: `section-${item.value}`,
      group: 'Разделы',
      label: item.label,
      hint: item.group,
      icon: item.icon,
      run: () => {
        setSection(item.value)
        setSelectedFile(null)
      },
    }))

    list.push({
      id: 'action-sync',
      group: 'Действия',
      label: 'Синхронизировать пространство',
      icon: 'RefreshCw',
      run: runSync,
    })

    for (const file of files.slice(0, 200)) {
      list.push({
        id: `file-${file.fileKey}`,
        group: 'Файлы',
        label: file.name,
        hint: file.projectName,
        icon: 'CalendarDays',
        run: () => openFile(file.fileKey, file.name),
      })
    }

    for (const person of perPersonStats(events, analyticsPrefs).slice(0, 60)) {
      list.push({
        id: `person-${person.handle}`,
        group: 'Участники',
        label: person.handle,
        hint: `${person.total} событий`,
        avatar: person.img,
        run: () => {
          setSection('people')
          setSelectedFile(null)
        },
      })
    }

    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, events, analyticsPrefs])

  const dense = prefs?.density === 'compact'
  const showFilters = !selectedFile && section !== 'settings' && section !== 'library'
  const isPinned = selectedFile ? (prefs?.pinnedFiles ?? []).some((item) => item.key === selectedFile.key) : false

  const sectionTitle = SECTIONS.find((item) => item.value === section)?.label ?? ''

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-1">
        <FigmaSidebar
          sections={SECTIONS}
          section={section}
          onSection={(next) => {
            setSection(next)
            setSelectedFile(null)
          }}
          selectedFileKey={selectedFile?.key ?? null}
          onSelectFile={openFile}
          teams={teams}
          onTeamsChanged={() => void reload()}
          pinned={prefs?.pinnedFiles ?? []}
          onUnpin={(key) => void togglePin(key, '')}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="shrink-0 px-4 pt-3">
            <div className="drag-region flex h-11 items-center justify-between gap-4">
              <h1 className="truncate text-[28px] font-bold leading-none tracking-tight text-ink">
                {selectedFile ? selectedFile.name : sectionTitle}
              </h1>
              <div className="no-drag flex shrink-0 items-center gap-2">
                {syncError ? (
                  <span
                    className="max-w-[240px] cursor-help truncate text-[12px] text-[var(--danger)]"
                    title={syncErrorDetails ?? syncError}
                  >
                    {syncError}
                  </span>
                ) : null}
                <span className="hidden text-[12px] text-faint lg:inline">
                  {events.length > 0 ? `${events.length.toLocaleString('ru')} событий` : ''}
                </span>
                <Button variant="soft" size="sm" onClick={runSync} disabled={syncing}>
                  {syncing ? <Spinner className="h-4 w-4" /> : <AppIcon name="RefreshCw" size={16} />}
                  {syncing ? 'Синхронизация…' : 'Синхронизировать'}
                </Button>
              </div>
            </div>

            {showFilters ? (
              <FilterBar
                filters={filters}
                onChange={setFilters}
                events={events}
                teams={teams}
                windowLabel={WINDOW_LABEL[filters.granularity]}
                presets={prefs?.filterPresets ?? []}
                onSavePreset={(name) => void savePreset(name)}
                onDeletePreset={(id) => void deletePreset(id)}
                matchedCount={scopedEvents.length}
                totalCount={events.length}
                syncing={syncing}
                progress={progress}
              />
            ) : syncing && progress ? (
              <div className="mt-3 flex items-center gap-2 rounded-card bg-surface p-2">
                <SyncProgressInline progress={progress} />
              </div>
            ) : null}
          </header>

          <VizPrefsProvider tablesByDefault={prefs?.tablesByDefault ?? false}>
          <main
            ref={mainScroll.ref}
            className={cn(
              'scroll-thin min-h-0 flex-1 overflow-y-auto px-4 pb-4',
              dense ? 'pt-2' : 'pt-3',
              mainScroll.className,
            )}
          >
            {selectedFile ? (
              <div className={dense ? 'space-y-2' : 'space-y-3'}>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                    <AppIcon name="ChevronLeft" size={16} />
                    Назад к аналитике
                  </Button>
                  <Button
                    variant={isPinned ? 'soft' : 'ghost'}
                    size="sm"
                    onClick={() => void togglePin(selectedFile.key, selectedFile.name)}
                  >
                    {isPinned ? <CheckGlyph size={16} /> : <PlusGlyph size={16} />}
                    {isPinned ? 'Закреплён' : 'Закрепить'}
                  </Button>
                </div>
                <FigmaFileDetail
                  key={selectedFile.key}
                  fileKey={selectedFile.key}
                  fallbackName={selectedFile.name}
                  onDataChanged={() => void reload()}
                />
              </div>
            ) : loading ? (
              <DashboardSkeleton />
            ) : section === 'settings' ? (
              <SettingsPanel
                user={user}
                sections={SECTIONS.map((item) => ({ value: item.value, label: item.label }))}
                onDataChanged={() => void reload()}
                onDisconnect={onDisconnect}
              />
            ) : events.length === 0 ? (
              <EmptyState onSync={runSync} syncing={syncing} hasTeams={teams.length > 0} />
            ) : section === 'insights' ? (
              <InsightsPanel
                events={scopedEvents}
                files={scopedFiles}
                granularity={filters.granularity}
                prefs={analyticsPrefs}
                thresholds={prefs?.insightThresholds}
                onOpenFile={openFile}
              />
            ) : section === 'dashboard' ? (
              <DashboardPanel
                events={scopedEvents}
                granularity={filters.granularity}
                prefs={analyticsPrefs}
                onOpenFile={openFile}
              />
            ) : section === 'trends' ? (
              <TrendsPanel events={scopedEvents} granularity={filters.granularity} />
            ) : section === 'people' ? (
              <PeoplePanel
                events={scopedEvents}
                granularity={filters.granularity}
                prefs={analyticsPrefs}
                onDataChanged={() => void reload()}
              />
            ) : section === 'threads' ? (
              <ThreadsPanel events={scopedEvents} granularity={filters.granularity} onOpenFile={openFile} />
            ) : section === 'activity' ? (
              <ActivityPanel events={scopedEvents} onOpenFile={openFile} />
            ) : section === 'files' ? (
              <FilesPanel
                files={scopedFiles}
                events={scopedEvents}
                granularity={filters.granularity}
                onOpenFile={openFile}
              />
            ) : (
              <LibraryPanel
                teams={filters.teams.length === 0 ? teams : teams.filter((team) => filters.teams.includes(team.id))}
              />
            )}
          </main>
          </VizPrefsProvider>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </div>
  )
}

/** Причина отказа объясняет, что делать: «упёрлись в лимит Figma» и «нет
 * доступа» требуют разных действий. */
const FAILURE_LABELS: Record<FigmaSyncFailureReason, string> = {
  'rate-limit': 'Figma ограничила частоту запросов — повторите синхронизацию позже',
  forbidden: 'нет доступа с этим токеном',
  missing: 'удалено или перемещено',
  unauthorized: 'токен больше не действует',
  unknown: 'неизвестная ошибка',
}

const SCOPE_LABELS: Record<FigmaSyncFailureScope, [string, string, string]> = {
  team: ['команда', 'команды', 'команд'],
  project: ['проект', 'проекта', 'проектов'],
  file: ['файл', 'файла', 'файлов'],
}

const SCOPE_PREFIX: Record<FigmaSyncFailureScope, string> = {
  team: 'Команда',
  project: 'Проект',
  file: 'Файл',
}

const SCOPE_ORDER: FigmaSyncFailureScope[] = ['team', 'project', 'file']

function plural(count: number, forms: [string, string, string]) {
  const mod100 = count % 100
  const mod10 = count % 10
  if (mod100 >= 11 && mod100 <= 14) return forms[2]
  if (mod10 === 1) return forms[0]
  if (mod10 >= 2 && mod10 <= 4) return forms[1]
  return forms[2]
}

/** Строка в шапке: сколько и чего именно не прочиталось. Имена не влезают —
 * они уходят в подсказку, см. listSyncErrors. */
export function describeSyncErrors(errors: FigmaSyncFailure[]): string {
  const counts = new Map<FigmaSyncFailureScope, number>()
  for (const failure of errors) counts.set(failure.scope, (counts.get(failure.scope) ?? 0) + 1)

  const parts = SCOPE_ORDER.filter((scope) => counts.has(scope)).map((scope) => {
    const count = counts.get(scope) as number
    return `${count} ${plural(count, SCOPE_LABELS[scope])}`
  })

  return `Не прочитано: ${parts.join(', ')}`
}

const DETAIL_LIMIT = 12

/** Подсказка: что именно не прочиталось и почему — иначе дыру в данных не найти. */
export function listSyncErrors(errors: FigmaSyncFailure[]): string {
  const lines = errors
    .slice(0, DETAIL_LIMIT)
    .map((failure) => `${SCOPE_PREFIX[failure.scope]} «${failure.name}» — ${FAILURE_LABELS[failure.reason]}`)

  const rest = errors.length - lines.length
  if (rest > 0) lines.push(`…и ещё ${rest}`)
  return lines.join('\n')
}

/** Прогресс синхронизации внутри панели инструментов — отдельной полосы,
 * сдвигающей весь контент вниз, больше нет. */
export function SyncProgressInline({ progress }: { progress: FigmaSyncProgress }) {
  const phase =
    progress.phase === 'projects'
      ? 'Проекты'
      : progress.phase === 'files'
        ? 'Файлы'
        : progress.phase === 'history'
          ? 'История'
          : 'Готово'
  const percent = progress.total > 0 ? (progress.done / progress.total) * 100 : 0

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--sunken)]">
        <div
          className="h-full rounded-full bg-[var(--grass)] transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="shrink-0 text-[12px] text-muted [font-variant-numeric:tabular-nums]">
        {phase} {progress.done}/{progress.total}
      </span>
      <span className="hidden min-w-0 max-w-[220px] truncate text-[12px] text-faint lg:block">
        {progress.rateLimitMs > 0
          ? `Лимит Figma — ждём ${Math.ceil(progress.rateLimitMs / 1000)} с`
          : progress.current}
      </span>
    </div>
  )
}

function EmptyState({
  onSync,
  syncing,
  hasTeams,
}: {
  onSync: () => void
  syncing: boolean
  hasTeams: boolean
}) {
  return (
    <EmptyBlock
      icon={<AppIcon name="RefreshCw" size={22} />}
      title={hasTeams ? 'Данных ещё нет' : 'Начните с команды'}
      description={
        hasTeams
          ? 'Синхронизация обойдёт все проекты и файлы команды и соберёт историю версий, обсуждений и реакций.'
          : 'Добавьте команду в панели слева, затем запустите синхронизацию.'
      }
      action={
        hasTeams ? (
          <Button variant="primary" onClick={onSync} disabled={syncing}>
            {syncing ? <Spinner /> : <AppIcon name="RefreshCw" size={16} />}
            Синхронизировать пространство
          </Button>
        ) : null
      }
    />
  )
}

export type { Section }
