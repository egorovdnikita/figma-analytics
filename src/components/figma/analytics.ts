import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import type { FigmaEvent, FigmaEventKind } from '@/types'
import { extractMentions } from './utils'

export type Granularity = 'day' | 'week' | 'month' | 'year'

export const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
  { value: 'year', label: 'Год' },
]

/** Размер окна сравнения в днях. Сравниваем не «календарный месяц против
 * календарного», а скользящие окна одинаковой длины — иначе текущий неполный
 * период всегда проигрывает прошлому просто потому, что ещё не закончился. */
export const WINDOW_DAYS: Record<Granularity, number> = { day: 1, week: 7, month: 30, year: 365 }

/** Сколько столбцов показываем на таймлайне при каждой гранулярности. */
export const TIMELINE_BUCKETS: Record<Granularity, number> = { day: 30, week: 12, month: 12, year: 5 }

export const WINDOW_LABEL: Record<Granularity, string> = {
  day: 'за сутки',
  week: 'за 7 дней',
  month: 'за 30 дней',
  year: 'за год',
}

export const PREVIOUS_LABEL: Record<Granularity, string> = {
  day: 'к прошлым суткам',
  week: 'к прошлым 7 дням',
  month: 'к прошлым 30 дням',
  year: 'к прошлому году',
}

export const EVENT_KINDS: FigmaEventKind[] = ['version', 'comment', 'reply', 'resolve', 'reaction']

export const EVENT_LABELS: Record<FigmaEventKind, string> = {
  version: 'Сохранения',
  comment: 'Комментарии',
  reply: 'Ответы',
  resolve: 'Решения',
  reaction: 'Реакции',
}

/** Цвет закреплён за типом события, а не за его местом в сортировке —
 * при смене фильтров «сохранения» остаются тем же синим. */
export const EVENT_COLOR_VAR: Record<FigmaEventKind, string> = {
  version: 'var(--viz-1)',
  comment: 'var(--viz-2)',
  reply: 'var(--viz-3)',
  resolve: 'var(--viz-4)',
  reaction: 'var(--viz-5)',
}

export interface Bucket {
  key: string
  label: string
  start: Date
  end: Date
  total: number
  counts: Record<FigmaEventKind, number>
}

function bucketStart(date: Date, granularity: Granularity): Date {
  switch (granularity) {
    case 'day':
      return startOfDay(date)
    case 'week':
      return startOfWeek(date, { weekStartsOn: 1 })
    case 'month':
      return startOfMonth(date)
    case 'year':
      return startOfYear(date)
  }
}

function bucketNext(date: Date, granularity: Granularity): Date {
  switch (granularity) {
    case 'day':
      return addDays(date, 1)
    case 'week':
      return addWeeks(date, 1)
    case 'month':
      return addMonths(date, 1)
    case 'year':
      return addYears(date, 1)
  }
}

function bucketLabel(date: Date, granularity: Granularity): string {
  switch (granularity) {
    case 'day':
      return format(date, 'd MMM', { locale: ru })
    case 'week':
      return format(date, 'd MMM', { locale: ru })
    case 'month':
      return format(date, 'LLL yy', { locale: ru })
    case 'year':
      return format(date, 'yyyy', { locale: ru })
  }
}

function emptyCounts(): Record<FigmaEventKind, number> {
  return { version: 0, comment: 0, reply: 0, resolve: 0, reaction: 0 }
}

/** Ряд подряд идущих корзин, заканчивающийся текущей. Пустые периоды остаются
 * в ряду с нулями — иначе провал в активности исчезает с графика. */
export function buildTimeline(events: FigmaEvent[], granularity: Granularity, count?: number): Bucket[] {
  const total = count ?? TIMELINE_BUCKETS[granularity]
  const now = new Date()

  const buckets: Bucket[] = []
  let cursor = bucketStart(now, granularity)
  for (let i = 0; i < total; i += 1) {
    buckets.unshift({
      key: cursor.toISOString(),
      label: bucketLabel(cursor, granularity),
      start: new Date(cursor),
      end: bucketNext(cursor, granularity),
      total: 0,
      counts: emptyCounts(),
    })
    cursor = new Date(
      granularity === 'day'
        ? addDays(cursor, -1)
        : granularity === 'week'
          ? addWeeks(cursor, -1)
          : granularity === 'month'
            ? addMonths(cursor, -1)
            : addYears(cursor, -1),
    )
  }

  const firstStart = buckets[0].start.getTime()
  const index = new Map(buckets.map((bucket, i) => [bucket.key, i]))

  for (const event of events) {
    const ts = new Date(event.ts)
    if (ts.getTime() < firstStart) continue
    const key = bucketStart(ts, granularity).toISOString()
    const i = index.get(key)
    if (i === undefined) continue
    buckets[i].counts[event.kind] += 1
    buckets[i].total += 1
  }

  return buckets
}

export interface WindowSlice {
  from: Date
  to: Date
  events: FigmaEvent[]
}

export interface Comparison {
  current: WindowSlice
  previous: WindowSlice
}

/** Текущее окно и такое же по длине окно прямо перед ним. */
export function compareWindows(events: FigmaEvent[], granularity: Granularity): Comparison {
  const days = WINDOW_DAYS[granularity]
  const now = new Date()
  const currentFrom = subDays(now, days)
  const previousFrom = subDays(now, days * 2)

  const current: FigmaEvent[] = []
  const previous: FigmaEvent[] = []
  for (const event of events) {
    const ts = new Date(event.ts).getTime()
    if (ts >= currentFrom.getTime() && ts <= now.getTime()) current.push(event)
    else if (ts >= previousFrom.getTime() && ts < currentFrom.getTime()) previous.push(event)
  }

  return {
    current: { from: currentFrom, to: now, events: current },
    previous: { from: previousFrom, to: currentFrom, events: previous },
  }
}

/** Процент изменения. null, когда сравнивать не с чем (в прошлом окне ноль) —
 * рост «с нуля» не выражается процентом и подписывается отдельно. */
export function deltaPercent(current: number, previous: number): number | null {
  if (previous === 0) return null
  return ((current - previous) / previous) * 100
}

export function countKind(events: FigmaEvent[], kind: FigmaEventKind) {
  let count = 0
  for (const event of events) if (event.kind === kind) count += 1
  return count
}

export function uniqueBy<T>(items: T[], key: (item: T) => string) {
  return new Set(items.map(key)).size
}

/* ---------- люди ---------- */

export interface PersonStats {
  handle: string
  img: string
  userId: string
  total: number
  counts: Record<FigmaEventKind, number>
  files: number
  projects: number
  firstSeen: string | null
  lastSeen: string | null
  activeDays: number
  mentionsReceived: number
  reactionsReceived: number
  /** Часы суток, в которые человек чаще всего активен. */
  peakHour: number | null
  nightShare: number
  weekendShare: number
  /** Самая длинная серия подряд идущих активных дней. */
  streak: number
  /** Событий в среднем за активный день — плотность работы, а не объём. */
  perActiveDay: number
  /** Сколько дней прошло между первым и последним событием. */
  tenureDays: number
  /** Дней тишины с последнего события. */
  silentDays: number
  activeDayList: string[]
}

export interface AnalyticsPrefs {
  nightStart: number
  nightEnd: number
  weekendDays: number[]
  workdayStart: number
  workdayEnd: number
}

export const DEFAULT_PREFS: AnalyticsPrefs = {
  nightStart: 22,
  nightEnd: 7,
  weekendDays: [0, 6],
  workdayStart: 9,
  workdayEnd: 19,
}

function isNight(hour: number, prefs: AnalyticsPrefs) {
  return prefs.nightStart > prefs.nightEnd
    ? hour >= prefs.nightStart || hour < prefs.nightEnd
    : hour >= prefs.nightStart && hour < prefs.nightEnd
}

export function perPersonStats(events: FigmaEvent[], prefs: AnalyticsPrefs = DEFAULT_PREFS): PersonStats[] {
  const map = new Map<
    string,
    PersonStats & { fileSet: Set<string>; projectSet: Set<string>; daySet: Set<string>; hours: number[] }
  >()

  const touch = (handle: string, img: string, userId: string) => {
    const existing = map.get(handle)
    if (existing) return existing
    const created = {
      handle,
      img,
      userId,
      total: 0,
      counts: emptyCounts(),
      files: 0,
      projects: 0,
      firstSeen: null as string | null,
      lastSeen: null as string | null,
      activeDays: 0,
      mentionsReceived: 0,
      reactionsReceived: 0,
      peakHour: null as number | null,
      nightShare: 0,
      weekendShare: 0,
      streak: 0,
      perActiveDay: 0,
      tenureDays: 0,
      silentDays: 0,
      activeDayList: [] as string[],
      fileSet: new Set<string>(),
      projectSet: new Set<string>(),
      daySet: new Set<string>(),
      hours: new Array(24).fill(0) as number[],
    }
    map.set(handle, created)
    return created
  }

  let nightTotals = new Map<string, number>()
  let weekendTotals = new Map<string, number>()

  for (const event of events) {
    // События «решено» приходят без автора: Figma не сообщает, кто закрыл тред.
    if (!event.handle) continue
    const person = touch(event.handle, event.img, event.userId)
    person.total += 1
    person.counts[event.kind] += 1
    person.fileSet.add(event.fileKey)
    if (event.projectId) person.projectSet.add(event.projectId)

    const date = new Date(event.ts)
    person.daySet.add(format(date, 'yyyy-MM-dd'))
    person.hours[date.getHours()] += 1

    const hour = date.getHours()
    if (isNight(hour, prefs)) nightTotals.set(event.handle, (nightTotals.get(event.handle) ?? 0) + 1)
    if (prefs.weekendDays.includes(date.getDay())) {
      weekendTotals.set(event.handle, (weekendTotals.get(event.handle) ?? 0) + 1)
    }

    if (!person.firstSeen || event.ts < person.firstSeen) person.firstSeen = event.ts
    if (!person.lastSeen || event.ts > person.lastSeen) person.lastSeen = event.ts

    if (event.kind === 'comment' || event.kind === 'reply') {
      for (const handle of extractMentions(event.message ?? '')) {
        touch(handle, '', '').mentionsReceived += 1
      }
    }
  }

  // Реакции засчитываем автору обсуждения, а не тому, кто поставил эмодзи.
  const threadAuthor = new Map<string, string>()
  for (const event of events) {
    if ((event.kind === 'comment' || event.kind === 'reply') && event.threadId && event.handle) {
      if (!threadAuthor.has(event.threadId)) threadAuthor.set(event.threadId, event.handle)
    }
  }
  for (const event of events) {
    if (event.kind !== 'reaction' || !event.threadId) continue
    const author = threadAuthor.get(event.threadId)
    if (author && map.has(author)) map.get(author)!.reactionsReceived += 1
  }

  const now = Date.now()

  return [...map.values()]
    .map((person) => {
      const peak = person.hours.reduce((best, value, hour) => (value > person.hours[best] ? hour : best), 0)
      const days = [...person.daySet].sort()
      return {
        handle: person.handle,
        img: person.img,
        userId: person.userId,
        total: person.total,
        counts: person.counts,
        files: person.fileSet.size,
        projects: person.projectSet.size,
        firstSeen: person.firstSeen,
        lastSeen: person.lastSeen,
        activeDays: person.daySet.size,
        activeDayList: days,
        mentionsReceived: person.mentionsReceived,
        reactionsReceived: person.reactionsReceived,
        peakHour: person.total > 0 ? peak : null,
        nightShare: person.total > 0 ? ((nightTotals.get(person.handle) ?? 0) / person.total) * 100 : 0,
        weekendShare: person.total > 0 ? ((weekendTotals.get(person.handle) ?? 0) / person.total) * 100 : 0,
        streak: longestStreak(days),
        perActiveDay: person.daySet.size > 0 ? person.total / person.daySet.size : 0,
        tenureDays:
          person.firstSeen && person.lastSeen
            ? Math.max(
                0,
                Math.round(
                  (new Date(person.lastSeen).getTime() - new Date(person.firstSeen).getTime()) / 86400000,
                ),
              )
            : 0,
        silentDays: person.lastSeen
          ? Math.max(0, Math.floor((now - new Date(person.lastSeen).getTime()) / 86400000))
          : 0,
      }
    })
    .sort((a, b) => b.total - a.total)
}

/** Самая длинная цепочка подряд идущих дат в формате yyyy-MM-dd. */
export function longestStreak(sortedDays: string[]): number {
  if (sortedDays.length === 0) return 0
  let best = 1
  let run = 1
  for (let i = 1; i < sortedDays.length; i += 1) {
    const prev = new Date(`${sortedDays[i - 1]}T00:00:00`).getTime()
    const curr = new Date(`${sortedDays[i]}T00:00:00`).getTime()
    if (Math.round((curr - prev) / 86400000) === 1) {
      run += 1
      best = Math.max(best, run)
    } else {
      run = 1
    }
  }
  return best
}

/** Новички периода — те, у кого самое первое событие вообще попало в окно. */
export function newcomers(events: FigmaEvent[], from: Date): string[] {
  const first = new Map<string, string>()
  for (const event of events) {
    if (!event.handle) continue
    const existing = first.get(event.handle)
    if (!existing || event.ts < existing) first.set(event.handle, event.ts)
  }
  return [...first.entries()]
    .filter(([, ts]) => new Date(ts).getTime() >= from.getTime())
    .map(([handle]) => handle)
}

/** Замолчавшие — были активны раньше, но за последние N дней ни одного события. */
export function dormant(events: FigmaEvent[], days: number): { handle: string; silentDays: number }[] {
  const last = new Map<string, string>()
  for (const event of events) {
    if (!event.handle) continue
    const existing = last.get(event.handle)
    if (!existing || event.ts > existing) last.set(event.handle, event.ts)
  }
  const cutoff = Date.now() - days * 86400000
  return [...last.entries()]
    .filter(([, ts]) => new Date(ts).getTime() < cutoff)
    .map(([handle, ts]) => ({
      handle,
      silentDays: Math.floor((Date.now() - new Date(ts).getTime()) / 86400000),
    }))
    .sort((a, b) => a.silentDays - b.silentDays)
}

/** Концентрация активности: какую долю всего объёма делают N самых активных.
 * Высокое значение = сильная зависимость от пары человек. */
export function concentration(people: PersonStats[], topN: number): number | null {
  const total = people.reduce((sum, person) => sum + person.total, 0)
  if (total === 0) return null
  const top = people.slice(0, topN).reduce((sum, person) => sum + person.total, 0)
  return (top / total) * 100
}

/** Распределение по часам суток — 24 корзины. */
export function hourDistribution(events: FigmaEvent[]) {
  const hours = new Array(24).fill(0) as number[]
  for (const event of events) hours[new Date(event.ts).getHours()] += 1
  return hours
}

/** Пары людей, регулярно работающих в одних и тех же файлах. */
export function collaborationPairs(events: FigmaEvent[], limit = 10) {
  const byFile = new Map<string, Set<string>>()
  for (const event of events) {
    if (!event.handle) continue
    const set = byFile.get(event.fileKey) ?? new Set<string>()
    set.add(event.handle)
    byFile.set(event.fileKey, set)
  }

  const pairs = new Map<string, { a: string; b: string; files: number }>()
  for (const handles of byFile.values()) {
    const list = [...handles].sort()
    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const key = `${list[i]}|${list[j]}`
        const existing = pairs.get(key) ?? { a: list[i], b: list[j], files: 0 }
        existing.files += 1
        pairs.set(key, existing)
      }
    }
  }

  return [...pairs.values()].sort((x, y) => y.files - x.files).slice(0, limit)
}

/* ---------- распределения ---------- */

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/** Матрица «день недели × час» — когда команда реально работает. */
export function weekHourMatrix(events: FigmaEvent[]) {
  const grid = WEEKDAYS.map(() => new Array(24).fill(0) as number[])
  for (const event of events) {
    const date = new Date(event.ts)
    const row = (date.getDay() + 6) % 7
    grid[row][date.getHours()] += 1
  }
  const max = Math.max(1, ...grid.flat())
  return { rows: WEEKDAYS, grid, max }
}

export function byField<T extends string>(events: FigmaEvent[], field: (event: FigmaEvent) => T | undefined) {
  const map = new Map<T, number>()
  for (const event of events) {
    const key = field(event)
    if (!key) continue
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count)
}

/** Скорость закрытия обсуждений в текущем и прошлом окне — метрика «упала ли
 * эффективность» для комментариев. */
export function resolutionSpeed(events: FigmaEvent[]) {
  const opened = new Map<string, string>()
  for (const event of events) {
    if (event.kind === 'comment' && event.threadId) opened.set(event.threadId, event.ts)
  }
  const durations: number[] = []
  for (const event of events) {
    if (event.kind !== 'resolve' || !event.threadId) continue
    const start = opened.get(event.threadId)
    if (!start) continue
    const ms = new Date(event.ts).getTime() - new Date(start).getTime()
    if (ms >= 0) durations.push(ms)
  }
  return durations
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/* ---------- глобальные фильтры ---------- */

export interface FigmaFilters {
  granularity: Granularity
  /** Произвольный диапазон. null — использовать скользящее окно гранулярности. */
  from: string | null
  to: string | null
  teams: string[]
  projects: string[]
  people: string[]
  kinds: FigmaEventKind[]
  /** Исключить работу в выходные / ночью из выборки. */
  workdaysOnly: boolean
  workHoursOnly: boolean
}

export const DEFAULT_FILTERS: FigmaFilters = {
  granularity: 'week',
  from: null,
  to: null,
  teams: [],
  projects: [],
  people: [],
  kinds: [...EVENT_KINDS],
  workdaysOnly: false,
  workHoursOnly: false,
}

export function filtersActive(filters: FigmaFilters) {
  return (
    filters.from !== null ||
    filters.to !== null ||
    filters.teams.length > 0 ||
    filters.projects.length > 0 ||
    filters.people.length > 0 ||
    filters.kinds.length !== EVENT_KINDS.length ||
    filters.workdaysOnly ||
    filters.workHoursOnly
  )
}

/** Единая точка отсечения: все панели работают с уже отфильтрованным потоком,
 * поэтому цифры на разных экранах не могут разойтись. */
export function applyFilters(
  events: FigmaEvent[],
  filters: FigmaFilters,
  prefs: AnalyticsPrefs = DEFAULT_PREFS,
): FigmaEvent[] {
  const from = filters.from ? new Date(filters.from).getTime() : null
  const to = filters.to ? new Date(`${filters.to.slice(0, 10)}T23:59:59`).getTime() : null
  const teams = new Set(filters.teams)
  const projects = new Set(filters.projects)
  const people = new Set(filters.people)
  const kinds = new Set(filters.kinds)

  return events.filter((event) => {
    if (!kinds.has(event.kind)) return false
    if (teams.size > 0 && !teams.has(event.teamId)) return false
    if (projects.size > 0 && !projects.has(event.projectId)) return false
    if (people.size > 0 && !people.has(event.handle)) return false

    const date = new Date(event.ts)
    const ts = date.getTime()
    if (from !== null && ts < from) return false
    if (to !== null && ts > to) return false

    if (filters.workdaysOnly && prefs.weekendDays.includes(date.getDay())) return false
    if (filters.workHoursOnly) {
      const hour = date.getHours()
      if (hour < prefs.workdayStart || hour >= prefs.workdayEnd) return false
    }
    return true
  })
}

/* ---------- обсуждения ---------- */

export interface ThreadStats {
  id: string
  fileKey: string
  fileName: string
  projectName: string
  author: string
  authorImg: string
  message: string
  openedAt: string
  firstReplyAt: string | null
  resolvedAt: string | null
  replies: number
  reactions: number
  participants: string[]
  /** Время до первого ответа — реакция команды на вопрос. */
  responseMs: number | null
  /** Время до закрытия обсуждения. */
  resolveMs: number | null
  ageDays: number
}

/** Собирает обсуждения из плоского потока: корень, ответы, реакции, закрытие. */
export function buildThreads(events: FigmaEvent[]): ThreadStats[] {
  const roots = new Map<string, FigmaEvent>()
  const replies = new Map<string, FigmaEvent[]>()
  const reactions = new Map<string, number>()
  const resolves = new Map<string, string>()

  for (const event of events) {
    if (!event.threadId) continue
    if (event.kind === 'comment') roots.set(event.threadId, event)
    else if (event.kind === 'reply') {
      const list = replies.get(event.threadId) ?? []
      list.push(event)
      replies.set(event.threadId, list)
    } else if (event.kind === 'reaction') {
      reactions.set(event.threadId, (reactions.get(event.threadId) ?? 0) + 1)
    } else if (event.kind === 'resolve') {
      const existing = resolves.get(event.threadId)
      if (!existing || event.ts < existing) resolves.set(event.threadId, event.ts)
    }
  }

  const now = Date.now()
  return [...roots.entries()]
    .map(([id, root]) => {
      const threadReplies = (replies.get(id) ?? []).sort((a, b) => a.ts.localeCompare(b.ts))
      const firstReplyAt = threadReplies[0]?.ts ?? null
      const resolvedAt = resolves.get(id) ?? null
      const participants = [...new Set([root.handle, ...threadReplies.map((r) => r.handle)].filter(Boolean))]
      return {
        id,
        fileKey: root.fileKey,
        fileName: root.fileName,
        projectName: root.projectName,
        author: root.handle,
        authorImg: root.img,
        message: root.message ?? '',
        openedAt: root.ts,
        firstReplyAt,
        resolvedAt,
        replies: threadReplies.length,
        reactions: reactions.get(id) ?? 0,
        participants,
        responseMs: firstReplyAt ? new Date(firstReplyAt).getTime() - new Date(root.ts).getTime() : null,
        resolveMs: resolvedAt ? new Date(resolvedAt).getTime() - new Date(root.ts).getTime() : null,
        ageDays: Math.floor((now - new Date(root.ts).getTime()) / 86400000),
      }
    })
    .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
}

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[index]
}

/* ---------- тренды ---------- */

/** Скользящее среднее — сглаживает шум, чтобы был виден тренд, а не всплески. */
export function movingAverage(values: number[], window: number): number[] {
  return values.map((_, index) => {
    const start = Math.max(0, index - window + 1)
    const slice = values.slice(start, index + 1)
    return slice.reduce((sum, value) => sum + value, 0) / slice.length
  })
}

export function cumulative(values: number[]): number[] {
  let running = 0
  return values.map((value) => (running += value))
}

/** Матрица «год × месяц» — сразу видно сезонность и провалы по годам. */
export function yearMonthMatrix(events: FigmaEvent[]) {
  const map = new Map<number, number[]>()
  for (const event of events) {
    const date = new Date(event.ts)
    const year = date.getFullYear()
    const row = map.get(year) ?? new Array(12).fill(0)
    row[date.getMonth()] += 1
    map.set(year, row)
  }
  const rows = [...map.entries()].map(([year, months]) => ({ year, months })).sort((a, b) => b.year - a.year)
  const max = Math.max(1, ...rows.flatMap((row) => row.months))
  return { rows, max }
}

/** Сравнение с тем же периодом год назад. */
export function yearOverYear(events: FigmaEvent[], granularity: Granularity) {
  const timeline = buildTimeline(events, granularity)
  return timeline.map((bucket) => {
    const shiftedStart = new Date(bucket.start)
    shiftedStart.setFullYear(shiftedStart.getFullYear() - 1)
    const shiftedEnd = new Date(bucket.end)
    shiftedEnd.setFullYear(shiftedEnd.getFullYear() - 1)
    let lastYear = 0
    for (const event of events) {
      const ts = new Date(event.ts).getTime()
      if (ts >= shiftedStart.getTime() && ts < shiftedEnd.getTime()) lastYear += 1
    }
    return { label: bucket.label, current: bucket.total, lastYear }
  })
}

/** Позиции участников в рейтинге по периодам — видно, кто поднимается и падает. */
export function rankOverTime(events: FigmaEvent[], granularity: Granularity, topN = 6) {
  const timeline = buildTimeline(events, granularity)
  const totals = new Map<string, number>()
  for (const event of events) {
    if (!event.handle) continue
    totals.set(event.handle, (totals.get(event.handle) ?? 0) + 1)
  }
  const leaders = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([handle]) => handle)

  const series = leaders.map((handle) => ({ handle, points: [] as { label: string; rank: number; value: number }[] }))

  for (const bucket of timeline) {
    const counts = new Map<string, number>()
    for (const event of events) {
      if (!event.handle) continue
      const ts = new Date(event.ts).getTime()
      if (ts >= bucket.start.getTime() && ts < bucket.end.getTime()) {
        counts.set(event.handle, (counts.get(event.handle) ?? 0) + 1)
      }
    }
    // Место считаем среди самих лидеров, а не среди всех активных: иначе ранг
    // может превысить глубину шкалы и точка уедет за пределы графика.
    const ordered = leaders
      .map((handle) => ({ handle, count: counts.get(handle) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.handle.localeCompare(b.handle))
      .map((entry) => entry.handle)

    for (const entry of series) {
      const index = ordered.indexOf(entry.handle)
      entry.points.push({
        label: bucket.label,
        rank: index === -1 ? leaders.length : index + 1,
        value: counts.get(entry.handle) ?? 0,
      })
    }
  }

  return { series, buckets: timeline.map((bucket) => bucket.label), depth: leaders.length }
}

/** Календарь активности по дням — «график вкладов» за длинный период. */
export function calendarDays(events: FigmaEvent[], days = 371) {
  const counts = new Map<string, number>()
  for (const event of events) {
    const key = format(new Date(event.ts), 'yyyy-MM-dd')
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const today = startOfDay(new Date())
  const cells: { date: Date; key: string; count: number }[] = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = addDays(today, -offset)
    const key = format(date, 'yyyy-MM-dd')
    cells.push({ date, key, count: counts.get(key) ?? 0 })
  }
  const max = Math.max(1, ...cells.map((cell) => cell.count))
  return { cells, max }
}
