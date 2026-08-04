import {
  addDays,
  addMonths,
  addWeeks,
  differenceInMinutes,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import type { CalendarEvent, ViewMode } from '@/types'

export const locale = ru

export const weekOptions = (firstDayOfWeek: 0 | 1) => ({ weekStartsOn: firstDayOfWeek } as const)

export function isAllDay(event: CalendarEvent) {
  return Boolean(event.start.date && !event.start.dateTime)
}

export function eventStart(event: CalendarEvent): Date {
  if (event.start.dateTime) return new Date(event.start.dateTime)
  return startOfDay(parse(event.start.date!, 'yyyy-MM-dd', new Date()))
}

export function eventEnd(event: CalendarEvent): Date {
  if (event.end.dateTime) return new Date(event.end.dateTime)
  // Для all-day Google отдаёт эксклюзивную дату окончания.
  return startOfDay(parse(event.end.date!, 'yyyy-MM-dd', new Date()))
}

/** Последний день, который событие визуально занимает. */
export function eventLastDay(event: CalendarEvent): Date {
  const end = eventEnd(event)
  if (isAllDay(event)) return startOfDay(addDays(end, -1))
  return startOfDay(end)
}

export function eventSpansDay(event: CalendarEvent, day: Date) {
  const from = startOfDay(eventStart(event))
  const to = eventLastDay(event)
  const d = startOfDay(day)
  return d >= from && d <= to
}

export function isMultiDay(event: CalendarEvent) {
  return !isSameDay(startOfDay(eventStart(event)), eventLastDay(event))
}

export interface DateRange {
  start: Date
  end: Date
  days: Date[]
}

export function rangeFor(view: ViewMode, anchor: Date, firstDayOfWeek: 0 | 1): DateRange {
  if (view === 'day') {
    const start = startOfDay(anchor)
    return { start, end: endOfDay(anchor), days: [start] }
  }
  if (view === 'week') {
    const start = startOfWeek(anchor, weekOptions(firstDayOfWeek))
    const end = endOfWeek(anchor, weekOptions(firstDayOfWeek))
    return { start, end, days: eachDay(start, 7) }
  }
  if (view === 'month') {
    const start = startOfWeek(startOfMonth(anchor), weekOptions(firstDayOfWeek))
    const end = endOfWeek(endOfMonth(anchor), weekOptions(firstDayOfWeek))
    const total = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1
    return { start, end, days: eachDay(start, total) }
  }
  const start = startOfDay(anchor)
  const end = endOfDay(addDays(anchor, 30))
  return { start, end, days: eachDay(start, 31) }
}

export function eachDay(start: Date, count: number) {
  return Array.from({ length: count }, (_, i) => addDays(start, i))
}

export function shiftAnchor(view: ViewMode, anchor: Date, direction: -1 | 1) {
  switch (view) {
    case 'day':
      return addDays(anchor, direction)
    case 'week':
      return addWeeks(anchor, direction)
    case 'month':
      return addMonths(anchor, direction)
    default:
      return addDays(anchor, direction * 30)
  }
}

export function rangeTitle(view: ViewMode, anchor: Date, firstDayOfWeek: 0 | 1) {
  if (view === 'day') return format(anchor, 'd MMMM yyyy', { locale })
  if (view === 'month') return format(anchor, 'LLLL yyyy', { locale })
  if (view === 'agenda') return `${format(anchor, 'd MMM', { locale })} — ${format(addDays(anchor, 30), 'd MMM yyyy', { locale })}`
  const start = startOfWeek(anchor, weekOptions(firstDayOfWeek))
  const end = endOfWeek(anchor, weekOptions(firstDayOfWeek))
  const sameMonth = start.getMonth() === end.getMonth()
  return sameMonth
    ? `${format(start, 'd', { locale })}—${format(end, 'd MMMM yyyy', { locale })}`
    : `${format(start, 'd MMM', { locale })} — ${format(end, 'd MMM yyyy', { locale })}`
}

export function formatTime(date: Date, timeFormat: '24h' | '12h') {
  return timeFormat === '24h' ? format(date, 'HH:mm') : format(date, 'h:mm a')
}

export function formatTimeShort(date: Date, timeFormat: '24h' | '12h') {
  if (timeFormat === '24h') return format(date, 'HH:mm')
  return format(date, date.getMinutes() === 0 ? 'h a' : 'h:mm a')
}

export function formatEventRange(event: CalendarEvent, timeFormat: '24h' | '12h') {
  if (isAllDay(event)) {
    const first = eventStart(event)
    const last = eventLastDay(event)
    return isSameDay(first, last)
      ? 'Весь день'
      : `${format(first, 'd MMM', { locale })} — ${format(last, 'd MMM', { locale })}, весь день`
  }
  const from = eventStart(event)
  const to = eventEnd(event)
  const same = isSameDay(from, to)
  return same
    ? `${formatTime(from, timeFormat)} — ${formatTime(to, timeFormat)}`
    : `${format(from, 'd MMM', { locale })}, ${formatTime(from, timeFormat)} — ${format(to, 'd MMM', { locale })}, ${formatTime(to, timeFormat)}`
}

export function durationLabel(event: CalendarEvent) {
  const minutes = differenceInMinutes(eventEnd(event), eventStart(event))
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`
}

export const toDateInput = (date: Date) => format(date, 'yyyy-MM-dd')
export const toTimeInput = (date: Date) => format(date, 'HH:mm')

export function fromInputs(dateStr: string, timeStr: string) {
  return parse(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', new Date())
}

/** Раскладка пересекающихся событий по колонкам внутри дня. */
export interface PositionedEvent {
  event: CalendarEvent
  top: number
  height: number
  left: number
  width: number
  columnIndex: number
}

export function layoutDay(
  events: CalendarEvent[],
  day: Date,
  pxPerMinute: number,
  dayStartHour: number,
): PositionedEvent[] {
  const dayStart = startOfDay(day)
  const items = events
    .map((event) => {
      const rawStart = eventStart(event)
      const rawEnd = eventEnd(event)
      const start = Math.max(differenceInMinutes(rawStart, dayStart), 0)
      const end = Math.min(differenceInMinutes(rawEnd, dayStart), 24 * 60)
      return { event, start, end: Math.max(end, start + 15) }
    })
    .sort((a, b) => a.start - b.start || b.end - a.end)

  const positioned: PositionedEvent[] = []
  let cluster: typeof items = []
  let clusterEnd = -1

  const flush = () => {
    if (!cluster.length) return
    const columns: (typeof items)[] = []
    for (const item of cluster) {
      let placed = false
      for (const column of columns) {
        if (column[column.length - 1].end <= item.start) {
          column.push(item)
          placed = true
          break
        }
      }
      if (!placed) columns.push([item])
    }
    const total = columns.length
    columns.forEach((column, columnIndex) => {
      for (const item of column) {
        positioned.push({
          event: item.event,
          top: (item.start - dayStartHour * 60) * pxPerMinute,
          height: Math.max((item.end - item.start) * pxPerMinute - 2, 18),
          left: (columnIndex / total) * 100,
          width: (1 / total) * 100,
          columnIndex,
        })
      }
    })
    cluster = []
  }

  for (const item of items) {
    if (cluster.length && item.start >= clusterEnd) flush()
    cluster.push(item)
    clusterEnd = Math.max(clusterEnd, item.end)
  }
  flush()

  return positioned
}

export { addDays, format, isSameDay, startOfDay, endOfDay, startOfWeek, startOfMonth }
