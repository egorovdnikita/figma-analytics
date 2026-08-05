import { format } from 'date-fns'
import { useApp } from '@/state/store'
import { rangeTitle, shiftAnchor } from '@/lib/date'
import { cn } from '@/lib/cn'
import { Button, IconButton, Segmented, Spinner } from '@/components/ui'
import { AppIcon } from '@/components/AppIcon'
import type { ViewMode } from '@/types'

const VIEWS: { value: ViewMode; label: string }[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'agenda', label: 'Список' },
]

export function Topbar() {
  const { view, setView, anchor, setAnchor, settings, query, setQuery, loading, refresh, syncedAt } =
    useApp()

  const title = rangeTitle(view, anchor, settings.firstDayOfWeek)

  return (
    <header className="shrink-0 px-4 pt-3">
      <div className="drag-region flex h-11 items-center justify-between gap-4">
        <h1 className="truncate text-[28px] font-medium leading-none tracking-tight text-ink">
          {title}
        </h1>
        <div className="no-drag flex shrink-0 items-center gap-2">
          <span className="hidden text-[12px] text-faint lg:inline">
            {loading ? '' : syncedAt ? `Обновлено в ${format(syncedAt, 'HH:mm')}` : ''}
          </span>
          <Button variant="soft" size="sm" onClick={() => void refresh()} disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : <AppIcon name="RefreshCw" size={16} />}
            {loading ? 'Синхронизация…' : 'Синхронизировать'}
          </Button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-card bg-surface p-2">
        <Button variant="outline" size="sm" className="ml-1" onClick={() => setAnchor(new Date())}>
          Сегодня
        </Button>
        <div className="flex items-center">
          <IconButton
            label="Назад"
            className="h-9 w-9"
            onClick={() => setAnchor(shiftAnchor(view, anchor, -1))}
          >
            <AppIcon name="ChevronLeft" size={18} />
          </IconButton>
          <IconButton
            label="Вперёд"
            className="h-9 w-9"
            onClick={() => setAnchor(shiftAnchor(view, anchor, 1))}
          >
            <AppIcon name="ChevronRight" size={18} />
          </IconButton>
        </div>

        <label className="relative flex min-w-0 flex-1 items-center">
          <AppIcon
            name="Search"
            size={16}
            className="pointer-events-none absolute left-3.5 text-faint"
          />
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
              <AppIcon name="X" size={16} />
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
