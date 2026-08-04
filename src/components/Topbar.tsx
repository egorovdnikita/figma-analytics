import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { useApp } from '@/state/store'
import { rangeTitle, shiftAnchor } from '@/lib/date'
import { cn } from '@/lib/cn'
import { Button, IconButton, Segmented } from '@/components/ui'
import type { ViewMode } from '@/types'

const VIEWS: { value: ViewMode; label: string }[] = [
  { value: 'day', label: 'день' },
  { value: 'week', label: 'неделя' },
  { value: 'month', label: 'месяц' },
  { value: 'agenda', label: 'список' },
]

export function Topbar() {
  const { view, setView, anchor, setAnchor, settings, query, setQuery } = useApp()

  const title = rangeTitle(view, anchor, settings.firstDayOfWeek)

  return (
    <header className="shrink-0 px-4 pt-3">
      <h1 className="truncate text-[26px] font-bold lowercase leading-none tracking-tight text-ink">
        {title}
      </h1>

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
