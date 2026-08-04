import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { differenceInMinutes, endOfDay, format, isToday, startOfDay } from 'date-fns'
import { useApp } from '@/state/store'
import {
  eventEnd,
  eventSpansDay,
  eventStart,
  formatTimeShort,
  isAllDay,
  layoutDay,
  locale,
} from '@/lib/date'
import { eventColor, readableInk, tint } from '@/lib/colors'
import { cn } from '@/lib/cn'
import type { CalendarEvent } from '@/types'

const HOUR_HEIGHT = 52
const PX_PER_MINUTE = HOUR_HEIGHT / 60
const SNAP_MINUTES = 15

function overlapsDay(event: CalendarEvent, day: Date) {
  return eventStart(event) < endOfDay(day) && eventEnd(event) > startOfDay(day)
}

export function TimeGridView({
  days,
  events,
  onOpenEvent,
  onCreateRange,
}: {
  days: Date[]
  events: CalendarEvent[]
  onOpenEvent: (event: CalendarEvent) => void
  onCreateRange: (start: Date, end: Date, allDay: boolean) => void
}) {
  const { calendars, settings, resolvedTheme } = useApp()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [now, setNow] = useState(() => new Date())
  const [draft, setDraft] = useState<{ dayIndex: number; from: number; to: number } | null>(null)

  const startHour = settings.dayStartHour
  const endHour = settings.dayEndHour
  const hours = useMemo(
    () => Array.from({ length: endHour - startHour }, (_, i) => startHour + i),
    [startHour, endHour],
  )

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])

  useLayoutEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const target = (8 - startHour) * HOUR_HEIGHT
    node.scrollTop = Math.max(target, 0)
  }, [startHour, days.length])

  const timed = events.filter((event) => !isAllDay(event))
  const allDay = events.filter(isAllDay)

  const gridTemplate = { gridTemplateColumns: `56px repeat(${days.length}, minmax(0, 1fr))` }

  const minutesFromPointer = (element: HTMLElement, clientY: number) => {
    const rect = element.getBoundingClientRect()
    const offset = clientY - rect.top
    const minutes = offset / PX_PER_MINUTE + startHour * 60
    return Math.max(
      startHour * 60,
      Math.min(Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES, endHour * 60),
    )
  }

  const handlePointerDown = (dayIndex: number) => (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    const column = event.currentTarget
    column.setPointerCapture(event.pointerId)
    const start = minutesFromPointer(column, event.clientY)
    setDraft({ dayIndex, from: start, to: start + SNAP_MINUTES * 2 })
  }

  const handlePointerMove = (dayIndex: number) => (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draft || draft.dayIndex !== dayIndex) return
    const current = minutesFromPointer(event.currentTarget, event.clientY)
    setDraft({ ...draft, to: Math.max(current, draft.from + SNAP_MINUTES) })
  }

  const handlePointerUp = () => {
    if (!draft) return
    const day = days[draft.dayIndex]
    const base = startOfDay(day)
    const start = new Date(base.getTime() + draft.from * 60_000)
    const end = new Date(base.getTime() + Math.max(draft.to, draft.from + SNAP_MINUTES) * 60_000)
    setDraft(null)
    onCreateRange(start, end, false)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card bg-surface">
      {/* шапка с днями */}
      <div className="grid border-b border-line pr-[10px]" style={gridTemplate}>
        <div />
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="flex flex-col items-center gap-0.5 border-l border-line py-2.5"
          >
            <span className="text-[12px] lowercase text-muted">
              {format(day, 'EEEEEE', { locale })}
            </span>
            <span
              className={cn(
                'flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-[16px] font-semibold',
                isToday(day) ? 'bg-[var(--grass)] text-white' : 'text-ink',
              )}
            >
              {format(day, 'd')}
            </span>
          </div>
        ))}
      </div>

      {/* события на весь день */}
      {allDay.length > 0 ? (
        <div className="grid border-b border-line pr-[10px]" style={gridTemplate}>
          <div className="py-2 pr-2 text-right text-[10px] uppercase tracking-wide text-faint">
            весь день
          </div>
          {days.map((day) => (
            <div key={day.toISOString()} className="min-h-9 space-y-1 border-l border-line p-1">
              {allDay
                .filter((event) => eventSpansDay(event, day))
                .map((event) => (
                  <AllDayChip
                    key={`${event.calendarId}:${event.id}:${day.toISOString()}`}
                    event={event}
                    color={eventColor(event, calendars)}
                    dark={resolvedTheme === 'dark'}
                    onClick={() => onOpenEvent(event)}
                  />
                ))}
            </div>
          ))}
        </div>
      ) : null}

      {/* сетка времени */}
      <div ref={scrollRef} className="scroll-thin scroll-thin-stable relative flex-1 overflow-y-auto">
        <div className="grid" style={gridTemplate}>
          <div className="relative">
            {hours.map((hour) => (
              <div key={hour} className="relative" style={{ height: HOUR_HEIGHT }}>
                <span className="absolute -top-2 right-2 text-[12px] tabular-nums text-faint">
                  {hour === startHour
                    ? ''
                    : formatTimeShort(new Date(2020, 0, 1, hour), settings.timeFormat)}
                </span>
              </div>
            ))}
          </div>

          {days.map((day, dayIndex) => {
            const dayEvents = timed.filter((event) => overlapsDay(event, day))
            const positioned = layoutDay(dayEvents, day, PX_PER_MINUTE, startHour)
            const showNow = isToday(day)
            const nowTop = (differenceInMinutes(now, startOfDay(now)) - startHour * 60) * PX_PER_MINUTE

            return (
              <div
                key={day.toISOString()}
                className="relative border-l border-line"
                style={{ height: hours.length * HOUR_HEIGHT }}
                onPointerDown={handlePointerDown(dayIndex)}
                onPointerMove={handlePointerMove(dayIndex)}
                onPointerUp={handlePointerUp}
                onPointerCancel={() => setDraft(null)}
              >
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="border-t border-line"
                    style={{ height: HOUR_HEIGHT }}
                  />
                ))}

                {draft && draft.dayIndex === dayIndex ? (
                  <div
                    className="pointer-events-none absolute inset-x-1 rounded-lg border-2 border-dashed border-[var(--grass)] bg-[var(--grass-soft)]"
                    style={{
                      top: (draft.from - startHour * 60) * PX_PER_MINUTE,
                      height: Math.max((draft.to - draft.from) * PX_PER_MINUTE, 16),
                    }}
                  />
                ) : null}

                {positioned.map(({ event, top, height, left, width }) => (
                  <TimedEvent
                    key={`${event.calendarId}:${event.id}`}
                    event={event}
                    color={eventColor(event, calendars)}
                    dark={resolvedTheme === 'dark'}
                    timeFormat={settings.timeFormat}
                    style={{
                      top,
                      height,
                      left: `calc(${left}% + 2px)`,
                      width: `calc(${width}% - 4px)`,
                    }}
                    onClick={() => onOpenEvent(event)}
                  />
                ))}

                {showNow && nowTop >= 0 ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                    style={{ top: nowTop }}
                  >
                    <span className="h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[var(--danger)]" />
                    <span className="h-px flex-1 bg-[var(--danger)]" />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TimedEvent({
  event,
  color,
  dark,
  timeFormat,
  style,
  onClick,
}: {
  event: CalendarEvent
  color: string
  dark: boolean
  timeFormat: '24h' | '12h'
  style: React.CSSProperties
  onClick: () => void
}) {
  const compact = (style.height as number) < 44
  const declined = event.attendees?.some((a) => a.self && a.responseStatus === 'declined')

  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      style={{
        ...style,
        background: tint(color, dark ? 0.22 : 0.16),
        color: readableInk(color, dark),
        borderLeft: `3px solid ${color}`,
        opacity: declined ? 0.55 : 1,
      }}
      className="absolute z-[5] flex flex-col overflow-hidden rounded-lg px-2 py-1 text-left transition-[filter] hover:brightness-[0.97]"
    >
      <span
        className={cn(
          'truncate text-[12px] font-semibold leading-tight',
          declined && 'line-through',
        )}
      >
        {event.summary || 'Без названия'}
      </span>
      {!compact ? (
        <span className="truncate text-[12px] opacity-80">
          {formatTimeShort(eventStart(event), timeFormat)}
          {event.location ? ` · ${event.location}` : ''}
        </span>
      ) : null}
    </button>
  )
}

function AllDayChip({
  event,
  color,
  dark,
  onClick,
}: {
  event: CalendarEvent
  color: string
  dark: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ background: tint(color, dark ? 0.24 : 0.18), color: readableInk(color, dark) }}
      className="block w-full truncate rounded-md px-2 py-1 text-left text-[12px] font-medium"
    >
      {event.summary || 'Без названия'}
    </button>
  )
}
