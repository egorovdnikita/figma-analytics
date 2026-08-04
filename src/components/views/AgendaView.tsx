import { useMemo } from 'react'
import { format, isToday } from 'date-fns'
import { useApp } from '@/state/store'
import { AppIcon } from '@/components/AppIcon'
import {
  durationLabel,
  eventSpansDay,
  eventStart,
  formatEventRange,
  isAllDay,
  locale,
} from '@/lib/date'
import { eventColor } from '@/lib/colors'
import { cn } from '@/lib/cn'
import type { CalendarEvent } from '@/types'

export function AgendaView({
  days,
  events,
  onOpenEvent,
}: {
  days: Date[]
  events: CalendarEvent[]
  onOpenEvent: (event: CalendarEvent) => void
}) {
  const { calendars, settings, query } = useApp()

  const groups = useMemo(
    () =>
      days
        .map((day) => ({
          day,
          items: events
            .filter((event) => eventSpansDay(event, day))
            .sort((a, b) => {
              const allDayDiff = Number(isAllDay(b)) - Number(isAllDay(a))
              if (allDayDiff !== 0) return allDayDiff
              return eventStart(a).getTime() - eventStart(b).getTime()
            }),
        }))
        .filter((group) => group.items.length > 0),
    [days, events],
  )

  if (groups.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-card bg-surface text-center">
        <AppIcon name="CalendarOff" size={26} className="text-faint" />
        <p className="text-[15px] font-semibold text-ink">
          {query ? 'Ничего не нашлось' : 'На этот период событий нет'}
        </p>
        <p className="max-w-[320px] text-[13px] text-muted">
          {query
            ? 'Измените запрос или расширьте период.'
            : 'Нажмите «Создать событие» или выделите время в сетке недели.'}
        </p>
      </div>
    )
  }

  return (
    <div className="scroll-thin h-full overflow-y-auto rounded-card bg-surface">
      {groups.map(({ day, items }) => (
        <section key={day.toISOString()} className="border-b border-line last:border-b-0">
          <div className="sticky top-0 z-10 flex items-baseline gap-2 bg-surface px-5 py-2.5">
            <span
              className={cn(
                'text-[15px] font-bold',
                isToday(day) ? 'text-[var(--lilac)]' : 'text-ink',
              )}
            >
              {format(day, 'd MMMM', { locale })}
            </span>
            <span className="text-[12px] lowercase text-muted">
              {format(day, 'EEEE', { locale })}
            </span>
          </div>

          <div className="pb-2">
            {items.map((event) => (
              <AgendaRow
                key={`${event.calendarId}:${event.id}:${day.toISOString()}`}
                event={event}
                color={eventColor(event, calendars)}
                timeFormat={settings.timeFormat}
                onClick={() => onOpenEvent(event)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function AgendaRow({
  event,
  color,
  timeFormat,
  onClick,
}: {
  event: CalendarEvent
  color: string
  timeFormat: '24h' | '12h'
  onClick: () => void
}) {
  const declined = event.attendees?.some((a) => a.self && a.responseStatus === 'declined')
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-5 py-2 text-left transition-colors hover:bg-[var(--sunken)]"
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="w-[168px] shrink-0 text-[13px] tabular-nums text-muted">
        {formatEventRange(event, timeFormat)}
      </span>
      <span className="min-w-0 flex-1 truncate">
        <span className={cn('text-[14px] font-medium text-ink', declined && 'line-through opacity-60')}>
          {event.summary || 'Без названия'}
        </span>
        {event.location ? (
          <span className="ml-2 text-[13px] text-muted">· {event.location}</span>
        ) : null}
      </span>
      {!isAllDay(event) ? (
        <span className="shrink-0 text-[12px] text-faint">{durationLabel(event)}</span>
      ) : null}
    </button>
  )
}
