import { ChevronLeft, ChevronRight, Moon, RefreshCw, Search, Sun, X } from 'lucide-react'
import { format } from 'date-fns'
import { useApp } from '@/state/store'
import { rangeTitle, shiftAnchor } from '@/lib/date'
import { cn } from '@/lib/cn'
import { Avatar, Button, IconButton, Segmented, Spinner } from '@/components/ui'
import type { ViewMode } from '@/types'

const VIEWS: { value: ViewMode; label: string }[] = [
  { value: 'day', label: 'день' },
  { value: 'week', label: 'неделя' },
  { value: 'month', label: 'месяц' },
  { value: 'agenda', label: 'список' },
]

export function Topbar() {
  const {
    view,
    setView,
    anchor,
    setAnchor,
    settings,
    updateSettings,
    resolvedTheme,
    query,
    setQuery,
    loading,
    refresh,
    profile,
    setScreen,
    syncedAt,
  } = useApp()

  const title = rangeTitle(view, anchor, settings.firstDayOfWeek)

  return (
    <header className="shrink-0 px-4 pt-3">
      <div className="drag-region flex h-11 items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-[26px] font-bold lowercase leading-none tracking-tight text-ink">
            {title}
          </h1>
        </div>

        <div className="no-drag flex items-center gap-1">
          <span className="mr-1 hidden text-[12px] text-faint md:inline">
            {loading ? 'синхронизация…' : syncedAt ? `обновлено в ${format(syncedAt, 'HH:mm')}` : ''}
          </span>
          <IconButton label="Обновить" onClick={() => void refresh()}>
            {loading ? <Spinner /> : <RefreshCw size={17} />}
          </IconButton>
          <IconButton
            label={resolvedTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            onClick={() =>
              void updateSettings({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' })
            }
          >
            {resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </IconButton>
          <button
            type="button"
            onClick={() => setScreen('profile')}
            className="ml-1 rounded-full transition-opacity hover:opacity-85"
            aria-label="Профиль"
          >
            <Avatar src={profile?.picture} name={profile?.name} size={36} />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-card bg-surface p-2">
        <Button variant="outline" size="sm" className="ml-1" onClick={() => setAnchor(new Date())}>
          сегодня
        </Button>
        <div className="flex items-center">
          <IconButton
            label="Назад"
            className="h-9 w-9"
            onClick={() => setAnchor(shiftAnchor(view, anchor, -1))}
          >
            <ChevronLeft size={18} />
          </IconButton>
          <IconButton
            label="Вперёд"
            className="h-9 w-9"
            onClick={() => setAnchor(shiftAnchor(view, anchor, 1))}
          >
            <ChevronRight size={18} />
          </IconButton>
        </div>

        <label className="relative flex min-w-0 flex-1 items-center">
          <Search size={17} className="pointer-events-none absolute left-3.5 text-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по событиям"
            className={cn(
              'h-10 w-full rounded-full bg-[var(--sunken)] pl-11 pr-10 text-sm text-ink',
              'placeholder:text-faint focus:outline-none',
            )}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Очистить поиск"
              className="absolute right-3 text-faint hover:text-ink"
            >
              <X size={16} />
            </button>
          ) : null}
        </label>

        <Segmented
          options={VIEWS}
          value={view}
          onChange={setView}
          className="bg-[var(--sunken)]"
        />
      </div>
    </header>
  )
}
