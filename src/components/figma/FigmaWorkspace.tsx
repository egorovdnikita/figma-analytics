import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  FigmaEvent,
  FigmaFileIndexEntry,
  FigmaPrefs,
  FigmaSyncFailure,
  FigmaSyncFailureReason,
  FigmaSyncFailureScope,
  FigmaSyncProgress,
  FigmaSyncState,
  FigmaTeamRef,
  FigmaUser,
} from '@/types'
import { ipc, IpcError } from '@/lib/ipc'
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
  filtersActive,
  perPersonStats,
} from './analytics'
import { relativeTime } from './utils'
import { FilterBar } from './FilterBar'
import { SyncStatus } from './SyncStatus'
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
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  /** Текущий синк начал планировщик: показываем его тише, чем нажатие кнопки. */
  const [autoSync, setAutoSync] = useState(false)
  const [nextAutoSyncAt, setNextAutoSyncAt] = useState<number | null>(null)

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

  const applyResult = useCallback(
    async (result: FigmaSyncState['lastResult']) => {
      if (!result) return
      setLastSyncAt(result.startedAt)
      void ipc.figmaSyncState().then((state) => setNextAutoSyncAt(state.nextAutoSyncAt))
      if (result.errors.length > 0) {
        setSyncError(describeSyncErrors(result.errors, result.staleFolders))
        setSyncErrorDetails(listSyncErrors(result.errors, result.staleFolders))
      } else {
        setSyncError(result.stopped ? 'Синхронизация остановлена' : null)
        setSyncErrorDetails(null)
      }
      await reload()
    },
    [reload],
  )

  // Синк идёт в main-процессе, поэтому при открытии раздела забираем его
  // состояние: вернувшись из календаря, пользователь видит тот же прогресс, а
  // не кнопку «Синхронизировать» поверх работающего обхода.
  useEffect(() => {
    void (async () => {
      const state = await ipc.figmaSyncState()
      setNextAutoSyncAt(state.nextAutoSyncAt)
      if (state.running) {
        setSyncing(true)
        setAutoSync(state.auto)
        setProgress(state.progress)
      }
      // Метка последнего синка живёт на диске, поэтому «обновлено …» есть и
      // после перезапуска, когда результата в памяти процесса ещё нет.
      if (state.lastSyncAt) setLastSyncAt(state.lastSyncAt)
      if (state.lastResult) {
        setLastSyncAt(state.lastResult.startedAt)
        if (state.lastResult.errors.length > 0) {
          setSyncError(describeSyncErrors(state.lastResult.errors, state.lastResult.staleFolders))
          setSyncErrorDetails(listSyncErrors(state.lastResult.errors, state.lastResult.staleFolders))
        }
      }
    })()
  }, [])

  useEffect(
    () =>
      ipc.figmaOnSyncStarted(({ auto }) => {
        setSyncing(true)
        setAutoSync(auto)
        if (auto) {
          // Фоновое обновление не должно стирать ошибку прошлого ручного
          // синка до того, как принесёт свой результат.
          setProgress(null)
        }
      }),
    [],
  )

  useEffect(
    () =>
      ipc.figmaOnSyncDone((result) => {
        setSyncing(false)
        setAutoSync(false)
        setProgress(null)
        void applyResult(result)
      }),
    [applyResult],
  )

  const runSync = async () => {
    setSyncing(true)
    setAutoSync(false)
    setSyncError(null)
    setSyncErrorDetails(null)
    try {
      await ipc.figmaSync()
    } catch (error) {
      setSyncError(error instanceof IpcError ? error.message : 'Синхронизация не удалась')
      setSyncing(false)
      setProgress(null)
    }
  }

  const stopSync = async () => {
    await ipc.figmaSyncStop()
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

    // Действия — то, что раньше требовало мыши и знания, где кнопка лежит.
    list.push(
      syncing
        ? {
            id: 'action-sync-stop',
            group: 'Действия',
            label: 'Остановить синхронизацию',
            icon: 'X',
            run: () => void stopSync(),
          }
        : {
            id: 'action-sync',
            group: 'Действия',
            label: 'Синхронизировать пространство',
            icon: 'RefreshCw',
            run: runSync,
          },
    )
    if (filtersActive(filters)) {
      list.push({
        id: 'action-reset-filters',
        group: 'Действия',
        label: 'Сбросить фильтры',
        icon: 'X',
        run: () => setFilters(DEFAULT_FILTERS),
      })
    }
    if (selectedFile) {
      const pinned = (prefs?.pinnedFiles ?? []).some((item) => item.key === selectedFile.key)
      list.push({
        id: 'action-pin',
        group: 'Действия',
        label: pinned ? 'Открепить текущий файл' : 'Закрепить текущий файл',
        hint: selectedFile.name,
        icon: 'Check',
        run: () => void togglePin(selectedFile.key, selectedFile.name),
      })
    }
    list.push({
      id: 'action-export',
      group: 'Действия',
      label: 'Выгрузить события в CSV',
      icon: 'ExternalLink',
      run: () => void ipc.figmaExportCsv(),
    })

    // Закреплённые — первыми среди файлов: их закрепляют ровно затем, чтобы
    // быстро к ним возвращаться.
    const pinnedKeys = new Set((prefs?.pinnedFiles ?? []).map((item) => item.key))
    for (const pin of prefs?.pinnedFiles ?? []) {
      list.push({
        id: `pinned-${pin.key}`,
        group: 'Закреплённые',
        label: pin.name,
        icon: 'CalendarDays',
        run: () => openFile(pin.key, pin.name),
      })
    }

    for (const file of files.slice(0, 200)) {
      if (pinnedKeys.has(file.fileKey)) continue
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
        // Раньше переход вёл в «Люди» без фильтра — человека приходилось
        // искать второй раз. Теперь вся аналитика сужается до него.
        run: () => {
          setFilters({ ...filters, people: [person.handle] })
          setSection('people')
          setSelectedFile(null)
        },
      })
    }

    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, events, analyticsPrefs, syncing, filters, selectedFile, prefs])

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
              <div className="no-drag flex min-w-0 shrink-0 items-center gap-2">
                <SyncStatus
                  syncing={syncing}
                  auto={autoSync}
                  progress={progress}
                  error={syncError}
                  errorDetails={syncErrorDetails}
                  lastSyncAt={lastSyncAt}
                  nextAutoSyncAt={nextAutoSyncAt}
                  onSync={runSync}
                  onStop={() => void stopSync()}
                />
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
              />
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
  expired: 'токен Figma истёк — выпустите новый и переподключитесь',
  missing: 'удалено или перемещено',
  unauthorized: 'токен больше не действует',
  network: 'связь оборвалась — попробуйте синхронизацию ещё раз',
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
export function describeSyncErrors(errors: FigmaSyncFailure[], staleFolders = 0): string {
  const counts = new Map<FigmaSyncFailureScope, number>()
  for (const failure of errors) counts.set(failure.scope, (counts.get(failure.scope) ?? 0) + 1)

  const parts = SCOPE_ORDER.filter((scope) => counts.has(scope)).map((scope) => {
    const count = counts.get(scope) as number
    return `${count} ${plural(count, SCOPE_LABELS[scope])}`
  })

  const tail = staleFolders > 0 ? ' — известные файлы обновлены' : ''
  return `Не прочитано: ${parts.join(', ')}${tail}`
}

/** Отказ на уровне команды почти всегда упирается в токен, а не в саму команду:
 * у personal access token может не быть прав на чтение файлов команды. */
const TEAM_FORBIDDEN_HINT = '(проверьте права токена и членство аккаунта в команде)'

const DETAIL_LIMIT = 12

/** Подсказка: что именно не прочиталось и почему — иначе дыру в данных не найти. */
export function listSyncErrors(errors: FigmaSyncFailure[], staleFolders = 0): string {
  const lines = errors.slice(0, DETAIL_LIMIT).map((failure) => {
    const head = `${SCOPE_PREFIX[failure.scope]} «${failure.name}» — ${FAILURE_LABELS[failure.reason]}`
    const hint = failure.scope === 'team' && failure.reason === 'forbidden' ? TEAM_FORBIDDEN_HINT : ''
    return [head, hint, failure.detail ? `[${failure.detail}]` : ''].filter(Boolean).join(' ')
  })

  const rest = errors.length - lines.length
  if (rest > 0) lines.push(`…и ещё ${rest}`)
  if (staleFolders > 0) {
    lines.push(
      `Состав ${staleFolders} ${plural(staleFolders, SCOPE_LABELS.project)} взят из прошлой синхронизации:`,
      'известные файлы обновлены, новые в этих папках не обнаружатся.',
    )
  }
  return lines.join('\n')
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
