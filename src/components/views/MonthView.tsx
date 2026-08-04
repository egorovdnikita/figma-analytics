import { useMemo, useState } from 'react'
import { format, isSameMonth, isToday, startOfDay } from 'date-fns'
import { useApp } from '@/state/store'
import { eventSpansDay, eventStart, formatTimeShort, isAllDay, locale } from '@/lib/date'
import { eventColor, readableInk, tint } from '@/lib/colors'
import { cn } from '@/lib/cn'
import { ScrollFadeTop } from '@/components/ScrollFade'
import type { CalendarEvent } from '@/types'

const WEEKDAYS_MON = ['понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота', 'воскресенье']

export function MonthView({
  days,
  anchor,
  events,
  onOpenEvent,
  onCreateRange,
}: {
  days: Date[]
  anchor: Date
  events: CalendarEvent[]
  onOpenEvent: (event: CalendarEvent) => void
  onCreateRange: (start: Date, end: Date, allDay: boolean) => void
}) {
  const { calendars, settings, resolvedTheme } = useApp()
  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  const weekdayLabels = useMemo(() => {
    const first = settings.firstDayOfWeek
    const base = WEEKDAYS_MON
    return first === 1 ? base : [base[6], ...base.slice(0, 6)]
  }, [settings.firstDayOfWeek])

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const day of days) {
      const key = day.toDateString()
      const list = events
        .filter((event) => eventSpansDay(event, day))
        .sort((a, b) => {
          const allDayDiff = Number(isAllDay(b)) - Number(isAllDay(a))
          if (allDayDiff !== 0) return allDayDiff
          return eventStart(a).getTime() - eventStart(b).getTime()
        })
      map.set(key, list)
    }
    return map
  }, [days, events])

  const weeks = Math.ceil(days.length / 7)

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card bg-surface">
      <div className="grid grid-cols-7 border-b border-line">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="truncate px-3 py-2 text-[11px] lowercase text-muted [&:not(:first-child)]:border-l [&:not(:first-child)]:border-line"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="relative min-h-0 flex-1">
      <div
        className="scroll-thin grid h-full overflow-y-auto"
        style={{ gridTemplateRows: `repeat(${weeks}, minmax(112px, 1fr))` }}
      >
        {Array.from({ length: weeks }, (_, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-line last:border-b-0">
            {days.slice(weekIndex * 7, weekIndex * 7 + 7).map((day) => {
              const key = day.toDateString()
              const dayEvents = byDay.get(key) ?? []
              const outside = !isSameMonth(day, anchor)
              const expanded = expandedDay === key
              const limit = expanded ? dayEvents.length : 3
              const hiddenCount = dayEvents.length - limit

              return (
                <div
                  key={key}
                  className={cn(
                    'group flex min-w-0 flex-col gap-1 border-l border-line p-1.5 first:border-l-0',
                    outside && 'bg-[var(--sunken)]',
                  )}
                  onDoubleClick={() => {
                    const start = startOfDay(day)
                    onCreateRange(start, start, true)
                  }}
                >
                  <div className="flex items-center justify-between px-1">
                    <span
                      className={cn(
                        'flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[12px] font-semibold',
                        isToday(day)
                          ? 'bg-[var(--grass)] text-white'
                          : outside
                            ? 'text-faint'
                            : 'text-ink',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {format(day, 'd') === '1' ? (
                      <span className="text-[11px] lowercase text-muted">
                        {format(day, 'LLL', { locale })}
                      </span>
                    ) : null}
                  </div>

                  <div className="min-h-0 flex-1 space-y-[3px] overflow-hidden">
                    {dayEvents.slice(0, limit).map((event) => {
                      const color = eventColor(event, calendars)
                      const dark = resolvedTheme === 'dark'
                      const allDay = isAllDay(event)
                      return (
                        <button
                          key={`${event.calendarId}:${event.id}`}
                          type="button"
                          onClick={() => onOpenEvent(event)}
                          style={
                            allDay
                              ? { background: tint(color, dark ? 0.26 : 0.18), color: readableInk(color, dark) }
                              : undefined
                          }
                          className={cn(
                            'flex w-full items-center gap-1.5 truncate rounded-md px-1.5 py-[3px] text-left text-[12px]',
                            allDay ? 'font-medium' : 'hover:bg-[var(--sunken)]',
                          )}
                        >
                          {!allDay ? (
                            <>
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ background: color }}
                              />
                              <span className="shrink-0 tabular-nums text-muted">
                                {formatTimeShort(eventStart(event), settings.timeFormat)}
                              </span>
                            </>
                          ) : null}
                          <span className="truncate">{event.summary || 'Без названия'}</span>
                        </button>
                      )
                    })}

                    {hiddenCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => setExpandedDay(expanded ? null : key)}
                        className="w-full rounded-md px-1.5 py-[3px] text-left text-[12px] text-[var(--lilac)] hover:bg-[var(--sunken)]"
                      >
                        ещё {hiddenCount}
                      </button>
                    ) : null}
                    {expanded ? (
                      <button
                        type="button"
                        onClick={() => setExpandedDay(null)}
                        className="w-full rounded-md px-1.5 py-[3px] text-left text-[12px] text-muted hover:bg-[var(--sunken)]"
                      >
                        свернуть
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <ScrollFadeTop from="var(--surface)" />
      </div>
    </div>
  )
}
