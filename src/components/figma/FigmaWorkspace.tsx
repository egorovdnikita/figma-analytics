import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  FigmaEvent,
  FigmaFileIndexEntry,
  FigmaPrefs,
  FigmaSyncProgress,
  FigmaTeamRef,
  FigmaUser,
} from '@/types'
import { ipc, BoxUiError } from '@/lib/ipc'
import { Avatar, Button, Spinner } from '@/components/ui'
import { AppIcon } from '@/components/AppIcon'
import { cn } from '@/lib/cn'
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
import { VizPrefsProvider } from './charts'
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

export function FigmaWorkspace({ user, onDisconnect }: { user: FigmaUser; onDisconnect: () => void }) {
  const [section, setSection] = useState<Section>('insights')
  const [selectedFile, setSelectedFile] = useState<{ key: string; name: string } | null>(null)
  const [filters, setFilters] = useState<FigmaFilters>(DEFAULT_FILTERS)
  const [collapsed, setCollapsed] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const [teams, setTeams] = useState<FigmaTeamRef[]>([])
  const [events, setEvents] = useState<FigmaEvent[]>([])
  const [files, setFiles] = useState<FigmaFileIndexEntry[]>([])
  const [prefs, setPrefs] = useState<FigmaPrefs | null>(null)
  const [loading, setLoading] = useState(true)
  const [bootstrapped, setBootstrapped] = useState(false)

  const [syncing, setSyncing] = useState(false)
  const [progress, setProgress] = useState<FigmaSyncProgress | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

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
    try {
      const result = await ipc.figmaSync()
      if (result.errors.length > 0) {
        setSyncError(`${result.errors.length} источников не прочитано: ${result.errors[0]}`)
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
    list.push({
      id: 'action-collapse',
      group: 'Действия',
      label: collapsed ? 'Развернуть навигацию' : 'Свернуть навигацию',
      icon: collapsed ? 'ChevronRight' : 'ChevronLeft',
      run: () => setCollapsed((value) => !value),
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
  }, [files, events, analyticsPrefs, collapsed])

  const dense = prefs?.density === 'compact'
  const showFilters = !selectedFile && section !== 'settings' && section !== 'library'
  const isPinned = selectedFile ? (prefs?.pinnedFiles ?? []).some((item) => item.key === selectedFile.key) : false

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="drag-region flex h-9 shrink-0 items-center gap-2 px-3">
        <span className="no-drag flex items-center gap-2 text-[12px] text-muted">
          <Avatar src={user.img_url} name={user.handle} size={20} />
          {user.handle}
        </span>
        <span className="ml-auto" />
        {syncError ? (
          <span className="no-drag max-w-[320px] truncate text-[11px] text-[var(--danger)]" title={syncError}>
            {syncError}
          </span>
        ) : null}
        <Button variant="ghost" size="sm" className="no-drag" onClick={runSync} disabled={syncing}>
          {syncing ? <Spinner className="h-3.5 w-3.5" /> : <AppIcon name="RefreshCw" size={14} />}
          {syncing ? 'Синхронизация…' : 'Синхронизировать'}
        </Button>
      </div>

      {syncing && progress ? <SyncBar progress={progress} /> : null}

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
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          pinned={prefs?.pinnedFiles ?? []}
          onUnpin={(key) => void togglePin(key, '')}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
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

          <VizPrefsProvider tablesByDefault={prefs?.tablesByDefault ?? false}>
          <div className={cn('scroll-thin min-h-0 flex-1 overflow-y-auto', dense ? 'p-2' : 'p-4')}>
            {selectedFile ? (
              <div className={dense ? 'space-y-2' : 'space-y-3'}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="flex h-8 items-center gap-1.5 rounded-control px-2 text-[12px] text-muted hover:bg-[var(--sunken)] hover:text-ink"
                  >
                    <AppIcon name="ChevronLeft" size={14} />
                    Назад к аналитике
                  </button>
                  <Button
                    variant={isPinned ? 'soft' : 'ghost'}
                    size="sm"
                    onClick={() => void togglePin(selectedFile.key, selectedFile.name)}
                  >
                    <AppIcon name={isPinned ? 'Check' : 'Plus'} size={14} />
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
              <div className="flex h-full items-center justify-center">
                <Spinner className="h-5 w-5" />
              </div>
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
          </div>
          </VizPrefsProvider>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </div>
  )
}

function SyncBar({ progress }: { progress: FigmaSyncProgress }) {
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
    <div className="shrink-0 border-b border-line px-4 py-2">
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <span className="font-medium text-ink">{phase}</span>
        <span>
          {progress.done} / {progress.total}
        </span>
        <span className="min-w-0 flex-1 truncate">{progress.current}</span>
      </div>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--sunken)]">
        <div
          className="h-full rounded-full bg-[var(--grass)] transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
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
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
      <AppIcon name="RefreshCw" size={28} className="text-faint" />
      <p className="max-w-[380px] text-[13px] leading-relaxed text-muted">
        {hasTeams
          ? 'Данных ещё нет. Запустите синхронизацию — приложение обойдёт все проекты и файлы команды и соберёт историю версий, обсуждений и реакций.'
          : 'Сначала добавьте команду в сайдбаре слева, затем запустите синхронизацию.'}
      </p>
      {hasTeams ? (
        <Button variant="primary" onClick={onSync} disabled={syncing}>
          {syncing ? <Spinner /> : <AppIcon name="RefreshCw" size={16} />}
          Синхронизировать пространство
        </Button>
      ) : null}
    </div>
  )
}

export type { Section }
