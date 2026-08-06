import { AppIcon } from '@/components/AppIcon'
import { useEffect, useMemo, useState } from 'react'
import type { FigmaDirectoryPerson, FigmaEvent } from '@/types'
import { ipc } from '@/lib/ipc'
import { Avatar, Input, Segmented } from '@/components/ui'
import { CrossGlyph, PlusGlyph } from '@/components/Glyphs'
import {
  EVENT_COLOR_VAR,
  EVENT_KINDS,
  EVENT_LABELS,
  AnalyticsPrefs,
  DEFAULT_PREFS,
  Granularity,
  PREVIOUS_LABEL,
  buildTimeline,
  byField,
  collaborationPairs,
  compareWindows,
  concentration,
  deltaPercent,
  dormant,
  newcomers,
  perPersonStats,
  weekHourMatrix,
} from './analytics'
import { ChartCard, Donut, EmptyBlock, HBars, Heatmap, Legend, LineChart, StackedBars, StatTile } from './charts'
import { relativeTime } from './utils'
import { cn } from '@/lib/cn'

/** Событие «решено» приходит от Figma без автора, поэтому в разрезе одного
 * человека эта серия всегда нулевая — не показываем её вовсе. */
const PERSON_KINDS = EVENT_KINDS.filter((kind) => kind !== 'resolve')

type Scope = 'all' | 'window'
type PersonRow = ReturnType<typeof perPersonStats>[number]

export function PeoplePanel({
  events,
  granularity,
  prefs = DEFAULT_PREFS,
  onDataChanged,
}: {
  events: FigmaEvent[]
  granularity: Granularity
  prefs?: AnalyticsPrefs
  onDataChanged: () => void
}) {
  const [scope, setScope] = useState<Scope>('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [directory, setDirectory] = useState<FigmaDirectoryPerson[]>([])

  useEffect(() => {
    ipc.figmaPeopleDirectory().then(setDirectory)
  }, [events])

  const { current, previous } = useMemo(() => compareWindows(events, granularity), [events, granularity])

  const allTime = useMemo(() => perPersonStats(events, prefs), [events, prefs])
  const currentPeople = useMemo(() => perPersonStats(current.events, prefs), [current.events, prefs])
  const previousPeople = useMemo(() => perPersonStats(previous.events, prefs), [previous.events, prefs])

  const currentByHandle = useMemo(
    () => new Map(currentPeople.map((person) => [person.handle, person])),
    [currentPeople],
  )
  const previousByHandle = useMemo(
    () => new Map(previousPeople.map((person) => [person.handle, person])),
    [previousPeople],
  )

  // По умолчанию — весь состав за всю историю: люди, работавшие раньше, но
  // молчавшие в текущем окне, всё равно должны быть в списке.
  const roster = scope === 'all' ? allTime : currentPeople

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return needle ? roster.filter((person) => person.handle.toLowerCase().includes(needle)) : roster
  }, [roster, query])

  const hidden = useMemo(() => directory.filter((person) => person.hidden), [directory])

  const totalEvents = allTime.reduce((sum, person) => sum + person.total, 0)
  const active = selected && filtered.some((p) => p.handle === selected) ? selected : filtered[0]?.handle ?? null

  const hide = async (handle: string) => {
    await ipc.figmaSetHiddenUsers([...hidden.map((p) => p.handle), handle])
    if (selected === handle) setSelected(null)
    onDataChanged()
  }

  const unhide = async (handle: string) => {
    await ipc.figmaSetHiddenUsers(hidden.map((p) => p.handle).filter((h) => h !== handle))
    onDataChanged()
  }

  if (allTime.length === 0) {
    return (
      <EmptyBlock
        icon={<AppIcon name="Users" size={22} />}
        title="Участников не найдено"
        description="Запустите синхронизацию, чтобы собрать историю пространства."
      />
    )
  }

  return (
    <div className="space-y-3">
      <TeamSummary events={events} allTime={allTime} current={current.events} granularity={granularity} />

      <ChartCard
        title="Состав команды"
        subtitle={
          scope === 'all'
            ? `${allTime.length} участников за всю историю · ${totalEvents.toLocaleString('ru')} событий`
            : `${currentPeople.length} активных в текущем периоде`
        }
        action={
          <Segmented
            value={scope}
            onChange={(value) => setScope(value as Scope)}
            options={[
              { value: 'all', label: 'Вся история' },
              { value: 'window', label: 'Период' },
            ]}
            className="bg-[var(--sunken)]"
          />
        }
        table={
          <RosterTable
            roster={filtered}
            totalEvents={totalEvents}
            currentByHandle={currentByHandle}
            previousByHandle={previousByHandle}
            scope={scope}
          />
        }
      >
        <div className="mb-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по участникам…"
            className="h-8 text-[13px]"
          />
        </div>

        <div className="scroll-thin max-h-[420px] overflow-y-auto pr-1">
          <div className="space-y-1">
            {filtered.map((person) => {
              const inWindow = currentByHandle.get(person.handle)
              const before = previousByHandle.get(person.handle)
              const delta = deltaPercent(inWindow?.total ?? 0, before?.total ?? 0)
              const max = roster[0]?.total || 1
              return (
                <div
                  key={person.handle}
                  className={cn(
                    'group flex items-center gap-3 rounded-control p-2 transition-colors',
                    active === person.handle ? 'bg-[var(--sunken)]' : 'hover:bg-[var(--sunken)]',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setSelected(person.handle)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <Avatar src={person.img} name={person.handle} size={26} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13.5px] text-ink">{person.handle}</span>
                        <span className="shrink-0 text-[12px] text-muted [font-variant-numeric:tabular-nums]">
                          {person.total.toLocaleString('ru')}
                        </span>
                      </div>
                      <div className="mt-1 flex h-2 gap-[2px] overflow-hidden rounded-[3px]">
                        {PERSON_KINDS.map((kind) =>
                          person.counts[kind] > 0 ? (
                            <div
                              key={kind}
                              style={{
                                width: `${(person.counts[kind] / max) * 100}%`,
                                background: EVENT_COLOR_VAR[kind],
                              }}
                            />
                          ) : null,
                        )}
                      </div>
                      <p className="mt-1 text-[11.5px] text-faint">
                        {person.files} файлов · {person.activeDays} активных дней
                        {person.silentDays > 0 ? ` · молчит ${person.silentDays} дн.` : ' · активен сегодня'}
                      </p>
                    </div>
                  </button>

                  <span
                    className="w-12 shrink-0 text-right text-[12px] [font-variant-numeric:tabular-nums]"
                    style={{ color: delta === null ? 'var(--muted)' : delta >= 0 ? 'var(--viz-good)' : 'var(--viz-bad)' }}
                    title={`Изменение ${PREVIOUS_LABEL[granularity]}`}
                  >
                    {delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(0)}%`}
                  </span>

                  <button
                    type="button"
                    onClick={() => void hide(person.handle)}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control text-faint opacity-0 hover:bg-[var(--line)] hover:text-ink group-hover:opacity-100"
                    aria-label={`Скрыть ${person.handle} из аналитики`}
                    title="Скрыть из аналитики — например, человека из другой команды"
                  >
                    <CrossGlyph size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </ChartCard>

      {hidden.length > 0 ? (
        <section className="rounded-card bg-surface p-4">
          <h3 className="mb-2 text-[14px] font-semibold text-ink">Скрытые из аналитики ({hidden.length})</h3>
          <p className="mb-3 text-[12px] text-muted">
            Их события полностью исключены из всех графиков и метрик раздела. Нажмите, чтобы вернуть.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {hidden.map((person) => (
              <button
                key={person.handle}
                type="button"
                onClick={() => void unhide(person.handle)}
                className="flex h-7 items-center gap-1.5 rounded-chip bg-[var(--sunken)] px-2.5 text-[13px] text-muted hover:text-ink"
                title="Вернуть в аналитику"
              >
                <Avatar src={person.img} name={person.handle} size={16} />
                {person.handle}
                <span className="text-faint">· {person.events}</span>
                <PlusGlyph size={13} />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {active ? (
        <PersonDetail
          handle={active}
          events={events}
          granularity={granularity}
          currentStats={currentByHandle.get(active) ?? null}
          previousStats={previousByHandle.get(active) ?? null}
          allTime={allTime.find((p) => p.handle === active) ?? null}
          teamTotal={totalEvents}
        />
      ) : null}
    </div>
  )
}

/* ---------- сводка по команде ---------- */

function TeamSummary({
  events,
  allTime,
  current,
  granularity,
}: {
  events: FigmaEvent[]
  allTime: PersonRow[]
  current: FigmaEvent[]
  granularity: Granularity
}) {
  const model = useMemo(() => {
    const windowFrom = new Date(Date.now() - 30 * 86400000)
    return {
      fresh: newcomers(events, windowFrom),
      silent: dormant(events, 30),
      busTop1: concentration(allTime, 1),
      busTop3: concentration(allTime, 3),
      pairs: collaborationPairs(events, 8),
      activeNow: new Set(current.filter((event) => event.handle).map((event) => event.handle)).size,
    }
  }, [events, allTime, current])

  return (
    <>
      <div className="grid grid-cols-4 gap-3">
        <StatTile label="Участников за всю историю" value={String(allTime.length)} />
        <StatTile
          label="Активны в текущем периоде"
          value={String(model.activeNow)}
          hint={`из ${allTime.length} за всю историю`}
        />
        <StatTile
          label="Новых за 30 дней"
          value={String(model.fresh.length)}
          hint={model.fresh.length > 0 ? model.fresh.slice(0, 3).join(', ') : 'пополнений не было'}
        />
        <StatTile
          label="Молчат 30+ дней"
          value={String(model.silent.length)}
          hint={
            model.silent.length > 0
              ? model.silent
                  .slice(0, 3)
                  .map((person) => person.handle)
                  .join(', ')
              : 'все активны'
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ChartCard
          title="Концентрация активности"
          subtitle="Какую долю всей работы делают самые активные"
          table={
            <table className="w-full text-[13px]">
              <tbody>
                <tr className="border-t border-line">
                  <td className="py-1.5 text-ink">Топ-1 участник</td>
                  <td className="py-1.5 pl-2 text-right text-muted">
                    {model.busTop1 !== null ? `${model.busTop1.toFixed(0)}%` : '—'}
                  </td>
                </tr>
                <tr className="border-t border-line">
                  <td className="py-1.5 text-ink">Топ-3 участника</td>
                  <td className="py-1.5 pl-2 text-right text-muted">
                    {model.busTop3 !== null ? `${model.busTop3.toFixed(0)}%` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          }
        >
          <div className="space-y-3 pt-1">
            <Meter label="Доля топ-1 участника" value={model.busTop1} />
            <Meter label="Доля топ-3 участников" value={model.busTop3} />
            <p className="text-[12px] leading-relaxed text-muted">
              Чем выше доля, тем сильнее пространство зависит от нескольких человек.
            </p>
          </div>
        </ChartCard>

        <ChartCard
          title="Кто с кем работает"
          subtitle="Пары участников по общим файлам"
          table={
            <table className="w-full text-[13px]">
              <tbody>
                {model.pairs.map((pair) => (
                  <tr key={`${pair.a}|${pair.b}`} className="border-t border-line">
                    <td className="py-1.5 text-ink">
                      {pair.a} ↔ {pair.b}
                    </td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                      {pair.files}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          {model.pairs.length === 0 ? (
            <p className="text-[13px] text-muted">Пересечений по файлам не найдено</p>
          ) : (
            <HBars
              color="var(--viz-3)"
              items={model.pairs.map((pair) => ({ label: `${pair.a} ↔ ${pair.b}`, value: pair.files }))}
              formatValue={(value) => `${value} ф.`}
            />
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Динамика состава"
        subtitle="Сколько разных людей были активны в каждом периоде"
        table={<HeadcountTable events={events} granularity={granularity} />}
      >
        <HeadcountChart events={events} granularity={granularity} />
      </ChartCard>
    </>
  )
}

function headcountPoints(events: FigmaEvent[], granularity: Granularity) {
  return buildTimeline(events, granularity).map((bucket) => {
    const set = new Set<string>()
    for (const event of events) {
      if (!event.handle) continue
      const ts = new Date(event.ts).getTime()
      if (ts >= bucket.start.getTime() && ts < bucket.end.getTime()) set.add(event.handle)
    }
    return { label: bucket.label, value: set.size }
  })
}

function HeadcountChart({ events, granularity }: { events: FigmaEvent[]; granularity: Granularity }) {
  const points = useMemo(() => headcountPoints(events, granularity), [events, granularity])
  return <LineChart area height={160} series={[{ name: 'Участников', color: 'var(--viz-1)', points }]} />
}

function HeadcountTable({ events, granularity }: { events: FigmaEvent[]; granularity: Granularity }) {
  const points = useMemo(() => headcountPoints(events, granularity), [events, granularity])
  return (
    <table className="w-full text-[13px]">
      <tbody>
        {points.map((point) => (
          <tr key={point.label} className="border-t border-line">
            <td className="py-1.5 text-ink">{point.label}</td>
            <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">{point.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Meter({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-[13px]">
        <span className="text-ink">{label}</span>
        <span className="text-muted [font-variant-numeric:tabular-nums]">
          {value !== null ? `${value.toFixed(0)}%` : '—'}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-[4px] bg-[var(--viz-seq-1)]">
        <div
          className="h-full rounded-[4px]"
          style={{
            width: `${Math.min(100, value ?? 0)}%`,
            background: (value ?? 0) > 70 ? 'var(--viz-bad)' : (value ?? 0) > 45 ? 'var(--viz-4)' : 'var(--viz-1)',
          }}
        />
      </div>
    </div>
  )
}

/* ---------- таблица состава ---------- */

function RosterTable({
  roster,
  totalEvents,
  currentByHandle,
  previousByHandle,
  scope,
}: {
  roster: PersonRow[]
  totalEvents: number
  currentByHandle: Map<string, PersonRow>
  previousByHandle: Map<string, PersonRow>
  scope: Scope
}) {
  return (
    <table className="w-full text-[13px]">
      <thead className="sticky top-0 bg-surface">
        <tr className="text-left text-[12px] text-faint">
          <th className="pb-1.5 font-medium">Участник</th>
          {PERSON_KINDS.map((kind) => (
            <th key={kind} className="pb-1.5 pl-2 text-right font-medium">
              {EVENT_LABELS[kind]}
            </th>
          ))}
          <th className="pb-1.5 pl-2 text-right font-medium">Всего</th>
          <th className="pb-1.5 pl-2 text-right font-medium">Доля</th>
          <th className="pb-1.5 pl-2 text-right font-medium">Файлов</th>
          <th className="pb-1.5 pl-2 text-right font-medium">Дней</th>
          <th className="pb-1.5 pl-2 text-right font-medium">Серия</th>
          <th className="pb-1.5 pl-2 text-right font-medium">В день</th>
          <th className="pb-1.5 pl-2 text-right font-medium">Молчит</th>
          <th className="pb-1.5 pl-2 text-right font-medium">Δ</th>
        </tr>
      </thead>
      <tbody>
        {roster.map((person) => {
          const inWindow = currentByHandle.get(person.handle)
          const before = previousByHandle.get(person.handle)
          const delta = deltaPercent(inWindow?.total ?? 0, before?.total ?? 0)
          return (
            <tr key={person.handle} className="border-t border-line">
              <td className="py-1.5">
                <div className="flex items-center gap-2">
                  <Avatar src={person.img} name={person.handle} size={20} />
                  <span className="truncate text-ink">{person.handle}</span>
                </div>
              </td>
              {PERSON_KINDS.map((kind) => (
                <td key={kind} className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                  {person.counts[kind]}
                </td>
              ))}
              <td className="py-1.5 pl-2 text-right font-medium text-ink [font-variant-numeric:tabular-nums]">
                {person.total}
              </td>
              <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                {scope === 'all' && totalEvents > 0 ? `${((person.total / totalEvents) * 100).toFixed(1)}%` : '—'}
              </td>
              <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">{person.files}</td>
              <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                {person.activeDays}
              </td>
              <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">{person.streak}</td>
              <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                {person.perActiveDay.toFixed(1)}
              </td>
              <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                {person.silentDays}
              </td>
              <td
                className="py-1.5 pl-2 text-right [font-variant-numeric:tabular-nums]"
                style={{ color: delta === null ? undefined : delta >= 0 ? 'var(--viz-good)' : 'var(--viz-bad)' }}
              >
                {delta === null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(0)}%`}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

/* ---------- карточка участника ---------- */

function PersonDetail({
  handle,
  events,
  granularity,
  currentStats,
  previousStats,
  allTime,
  teamTotal,
}: {
  handle: string
  events: FigmaEvent[]
  granularity: Granularity
  currentStats: PersonRow | null
  previousStats: PersonRow | null
  allTime: PersonRow | null
  teamTotal: number
}) {
  const mine = useMemo(() => events.filter((event) => event.handle === handle), [events, handle])
  const timeline = useMemo(() => buildTimeline(mine, granularity), [mine, granularity])
  const heat = useMemo(() => weekHourMatrix(mine), [mine])

  const topFiles = useMemo(() => {
    const names = new Map<string, string>()
    for (const event of mine) names.set(event.fileKey, event.fileName)
    return byField(mine, (event) => event.fileKey)
      .slice(0, 8)
      .map((entry) => ({ label: names.get(entry.key) ?? entry.key, value: entry.count }))
  }, [mine])

  const topProjects = useMemo(
    () =>
      byField(mine, (event) => event.projectName || undefined)
        .slice(0, 8)
        .map((entry) => ({ label: entry.key, value: entry.count })),
    [mine],
  )

  const delta = deltaPercent(currentStats?.total ?? 0, previousStats?.total ?? 0)

  return (
    <div className="space-y-3">
      <div className="viz rounded-card bg-surface p-4">
        <div className="flex items-start gap-3">
          <Avatar src={allTime?.img} name={handle} size={44} />
          <div className="min-w-0 flex-1">
            <h3 className="text-[16px] font-semibold text-ink">{handle}</h3>
            <p className="mt-0.5 text-[12px] text-muted">
              {allTime?.firstSeen ? `Первое событие ${relativeTime(allTime.firstSeen)}` : '—'}
              {allTime?.lastSeen ? ` · последнее ${relativeTime(allTime.lastSeen)}` : ''}
              {allTime?.tenureDays ? ` · в пространстве ${allTime.tenureDays} дн.` : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display display-md text-ink">
              {(allTime?.total ?? 0).toLocaleString('ru')}
            </p>
            <p className="mt-1 text-[12px] text-muted">Событий за всю историю</p>
            <p
              className="mt-0.5 text-[12px]"
              style={{ color: delta === null ? 'var(--muted)' : delta >= 0 ? 'var(--viz-good)' : 'var(--viz-bad)' }}
            >
              {delta === null
                ? `${currentStats?.total ?? 0} за период`
                : `${delta > 0 ? '+' : ''}${delta.toFixed(0)}% ${PREVIOUS_LABEL[granularity]}`}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-6 gap-3 rounded-control bg-[var(--sunken)] p-3 text-[13px]">
          <Metric
            label="Доля в команде"
            value={teamTotal > 0 ? `${(((allTime?.total ?? 0) / teamTotal) * 100).toFixed(1)}%` : '—'}
          />
          <Metric label="Файлов" value={String(allTime?.files ?? 0)} />
          <Metric label="Проектов" value={String(allTime?.projects ?? 0)} />
          <Metric label="Активных дней" value={String(allTime?.activeDays ?? 0)} />
          <Metric label="Макс. серия" value={`${allTime?.streak ?? 0} дн.`} />
          <Metric label="Событий в день" value={(allTime?.perActiveDay ?? 0).toFixed(1)} />
          <Metric
            label="Пик активности"
            value={
              allTime?.peakHour !== null && allTime?.peakHour !== undefined
                ? `${String(allTime.peakHour).padStart(2, '0')}:00`
                : '—'
            }
          />
          <Metric label="Ночью (22–07)" value={`${(allTime?.nightShare ?? 0).toFixed(0)}%`} />
          <Metric label="В выходные" value={`${(allTime?.weekendShare ?? 0).toFixed(0)}%`} />
          <Metric label="Упоминаний" value={String(allTime?.mentionsReceived ?? 0)} />
          <Metric label="Реакций получено" value={String(allTime?.reactionsReceived ?? 0)} />
          <Metric label="Молчит" value={`${allTime?.silentDays ?? 0} дн.`} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ChartCard
          title={`Динамика: ${handle}`}
          subtitle="Все события участника по периодам"
          legend={
            <Legend items={PERSON_KINDS.map((kind) => ({ label: EVENT_LABELS[kind], color: EVENT_COLOR_VAR[kind] }))} />
          }
          table={
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[12px] text-faint">
                  <th className="pb-1.5 font-medium">Период</th>
                  {PERSON_KINDS.map((kind) => (
                    <th key={kind} className="pb-1.5 pl-2 text-right font-medium">
                      {EVENT_LABELS[kind]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeline.map((bucket) => (
                  <tr key={bucket.key} className="border-t border-line">
                    <td className="py-1.5 text-ink">{bucket.label}</td>
                    {PERSON_KINDS.map((kind) => (
                      <td key={kind} className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                        {bucket.counts[kind]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <StackedBars
            height={180}
            buckets={timeline.map((bucket) => ({ key: bucket.key, label: bucket.label }))}
            series={PERSON_KINDS.map((kind) => ({
              name: EVENT_LABELS[kind],
              color: EVENT_COLOR_VAR[kind],
              values: timeline.map((bucket) => bucket.counts[kind]),
            }))}
          />
        </ChartCard>

        <ChartCard
          title={`Расписание: ${handle}`}
          subtitle="День недели × час, за всю историю"
          table={
            <table className="w-full text-[13px]">
              <tbody>
                {heat.rows.map((row, i) => (
                  <tr key={row} className="border-t border-line">
                    <td className="py-1.5 text-ink">{row}</td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                      {heat.grid[i].reduce((a, b) => a + b, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <Heatmap rows={heat.rows} grid={heat.grid} max={heat.max} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ChartCard
          title="Файлы"
          subtitle="По числу событий"
          table={
            <table className="w-full text-[13px]">
              <tbody>
                {topFiles.map((file) => (
                  <tr key={file.label} className="border-t border-line">
                    <td className="py-1.5 text-ink">{file.label}</td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                      {file.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <HBars items={topFiles} />
        </ChartCard>

        <ChartCard
          title="Проекты"
          subtitle="По числу событий"
          table={
            <table className="w-full text-[13px]">
              <tbody>
                {topProjects.map((project) => (
                  <tr key={project.label} className="border-t border-line">
                    <td className="py-1.5 text-ink">{project.label}</td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                      {project.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <HBars items={topProjects} color="var(--viz-3)" />
        </ChartCard>

        <ChartCard
          title="Профиль активности"
          subtitle="Доли типов событий"
          table={
            <table className="w-full text-[13px]">
              <tbody>
                {PERSON_KINDS.map((kind) => (
                  <tr key={kind} className="border-t border-line">
                    <td className="py-1.5 text-ink">{EVENT_LABELS[kind]}</td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                      {allTime?.counts[kind] ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <Donut
            size={112}
            centerValue={String(allTime?.total ?? 0)}
            centerLabel="событий"
            segments={PERSON_KINDS.filter((kind) => (allTime?.counts[kind] ?? 0) > 0).map((kind) => ({
              label: EVENT_LABELS[kind],
              value: allTime?.counts[kind] ?? 0,
              color: EVENT_COLOR_VAR[kind],
            }))}
          />
        </ChartCard>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-muted">{label}</p>
      <p className="mt-0.5 font-display display-sm text-ink">{value}</p>
    </div>
  )
}
