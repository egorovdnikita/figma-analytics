import { useMemo } from 'react'
import type { FigmaEvent } from '@/types'
import {
  EVENT_COLOR_VAR,
  EVENT_KINDS,
  EVENT_LABELS,
  Granularity,
  PREVIOUS_LABEL,
  buildTimeline,
  calendarDays,
  compareWindows,
  countKind,
  cumulative,
  deltaPercent,
  movingAverage,
  perPersonStats,
  rankOverTime,
  yearMonthMatrix,
  yearOverYear,
} from './analytics'
import {
  BumpChart,
  CalendarHeatmap,
  ChartCard,
  DualLine,
  Legend,
  LineChart,
  SmallMultiples,
  StatTile,
  YearMonthGrid,
} from './charts'

const SERIES_COLORS = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)', 'var(--viz-4)', 'var(--viz-5)']

export function TrendsPanel({
  events,
  granularity,
}: {
  events: FigmaEvent[]
  granularity: Granularity
}) {
  const model = useMemo(() => {
    const timeline = buildTimeline(events, granularity)
    const totals = timeline.map((bucket) => bucket.total)
    const { current, previous } = compareWindows(events, granularity)

    // Простая линейная экстраполяция по последним точкам: не прогноз в строгом
    // смысле, а продолжение уже наблюдаемого тренда.
    const tail = totals.slice(-6)
    const slope =
      tail.length > 1
        ? (tail[tail.length - 1] - tail[0]) / (tail.length - 1)
        : 0

    const people = perPersonStats(events).slice(0, 8)
    const perPersonSeries = people.map((person) => {
      const mine = events.filter((event) => event.handle === person.handle)
      const line = buildTimeline(mine, granularity)
      return { label: person.handle, values: line.map((bucket) => bucket.total), total: person.total }
    })

    return {
      timeline,
      totals,
      moving: movingAverage(totals, granularity === 'day' ? 7 : 3),
      cumulative: cumulative(totals),
      yoy: yearOverYear(events, granularity),
      matrix: yearMonthMatrix(events),
      calendar: calendarDays(events, 371),
      rank: rankOverTime(events, granularity, 6),
      perPersonSeries,
      slope,
      current,
      previous,
      delta: deltaPercent(current.events.length, previous.events.length),
      kindDeltas: EVENT_KINDS.map((kind) => ({
        kind,
        current: countKind(current.events, kind),
        previous: countKind(previous.events, kind),
        delta: deltaPercent(countKind(current.events, kind), countKind(previous.events, kind)),
      })),
    }
  }, [events, granularity])

  if (events.length === 0) {
    return (
      <p className="rounded-card bg-surface p-6 text-center text-[14px] text-muted">
        Нет данных за выбранный период. Ослабьте фильтры или запустите синхронизацию.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <StatTile
          label="Событий за период"
          value={String(model.current.events.length)}
          delta={model.delta}
          deltaLabel={PREVIOUS_LABEL[granularity]}
          spark={model.totals}
        />
        <StatTile
          label="Накоплено за всё время"
          value={events.length.toLocaleString('ru')}
          spark={model.cumulative}
          hint="суммарно событий в выборке"
        />
        <StatTile
          label="Тренд последних периодов"
          value={`${model.slope > 0 ? '+' : ''}${model.slope.toFixed(1)}`}
          hint="изменение за период, в среднем"
        />
        <StatTile
          label="Пиковый период"
          value={String(Math.max(...model.totals, 0))}
          hint={model.timeline[model.totals.indexOf(Math.max(...model.totals))]?.label ?? ''}
        />
      </div>

      <ChartCard
        title="Тренд с сглаживанием"
        subtitle="сырые значения и скользящее среднее — всплески отдельно от тенденции"
        legend={
          <Legend
            items={[
              { label: 'Факт', color: 'var(--viz-1)' },
              { label: 'Скользящее среднее', color: 'var(--viz-2)' },
            ]}
          />
        }
        table={
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[12px] text-faint">
                <th className="pb-1.5 font-medium">Период</th>
                <th className="pb-1.5 pl-2 text-right font-medium">Факт</th>
                <th className="pb-1.5 pl-2 text-right font-medium">Среднее</th>
                <th className="pb-1.5 pl-2 text-right font-medium">Накоп.</th>
              </tr>
            </thead>
            <tbody>
              {model.timeline.map((bucket, index) => (
                <tr key={bucket.key} className="border-t border-line">
                  <td className="py-1.5 text-ink">{bucket.label}</td>
                  <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">{bucket.total}</td>
                  <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                    {model.moving[index].toFixed(1)}
                  </td>
                  <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                    {model.cumulative[index]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <LineChart
          height={200}
          series={[
            {
              name: 'Факт',
              color: 'var(--viz-1)',
              points: model.timeline.map((bucket) => ({ label: bucket.label, value: bucket.total })),
            },
            {
              name: 'Скользящее среднее',
              color: 'var(--viz-2)',
              points: model.timeline.map((bucket, index) => ({
                label: bucket.label,
                value: Math.round(model.moving[index] * 10) / 10,
              })),
            },
          ]}
        />
      </ChartCard>

      <div className="grid grid-cols-2 gap-3">
        <ChartCard
          title="Год к году"
          subtitle="тот же период годом ранее"
          legend={
            <Legend
              items={[
                { label: 'Сейчас', color: 'var(--viz-1)' },
                { label: 'Год назад', color: 'var(--viz-2)' },
              ]}
            />
          }
          table={
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[12px] text-faint">
                  <th className="pb-1.5 font-medium">Период</th>
                  <th className="pb-1.5 pl-2 text-right font-medium">Сейчас</th>
                  <th className="pb-1.5 pl-2 text-right font-medium">Год назад</th>
                  <th className="pb-1.5 pl-2 text-right font-medium">Δ</th>
                </tr>
              </thead>
              <tbody>
                {model.yoy.map((row) => {
                  const delta = deltaPercent(row.current, row.lastYear)
                  return (
                    <tr key={row.label} className="border-t border-line">
                      <td className="py-1.5 text-ink">{row.label}</td>
                      <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                        {row.current}
                      </td>
                      <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                        {row.lastYear}
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
          }
        >
          <DualLine points={model.yoy} currentLabel="Сейчас" previousLabel="Год назад" />
        </ChartCard>

        <ChartCard
          title="Накопленный объём"
          subtitle="как рос суммарный след команды"
          table={
            <table className="w-full text-[13px]">
              <tbody>
                {model.timeline.map((bucket, index) => (
                  <tr key={bucket.key} className="border-t border-line">
                    <td className="py-1.5 text-ink">{bucket.label}</td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                      {model.cumulative[index]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <LineChart
            area
            height={190}
            series={[
              {
                name: 'Накоплено',
                color: 'var(--viz-3)',
                points: model.timeline.map((bucket, index) => ({
                  label: bucket.label,
                  value: model.cumulative[index],
                })),
              },
            ]}
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Календарь активности"
        subtitle="каждый день за последний год — сразу видны отпуска, авралы и мёртвые недели"
        table={
          <table className="w-full text-[13px]">
            <tbody>
              {model.calendar.cells
                .filter((cell) => cell.count > 0)
                .slice(-60)
                .reverse()
                .map((cell) => (
                  <tr key={cell.key} className="border-t border-line">
                    <td className="py-1.5 text-ink">{cell.key}</td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                      {cell.count}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        }
      >
        <CalendarHeatmap cells={model.calendar.cells} max={model.calendar.max} />
      </ChartCard>

      <div className="grid grid-cols-2 gap-3">
        <ChartCard
          title="Сезонность по месяцам"
          subtitle="год × месяц за всю историю"
          table={
            <table className="w-full text-[13px]">
              <tbody>
                {model.matrix.rows.map((row) => (
                  <tr key={row.year} className="border-t border-line">
                    <td className="py-1.5 text-ink">{row.year}</td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                      {row.months.reduce((a, b) => a + b, 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <YearMonthGrid rows={model.matrix.rows} max={model.matrix.max} />
        </ChartCard>

        <ChartCard
          title="Изменение по типам событий"
          subtitle={`текущий период ${PREVIOUS_LABEL[granularity]}`}
          table={
            <table className="w-full text-[13px]">
              <tbody>
                {model.kindDeltas.map((row) => (
                  <tr key={row.kind} className="border-t border-line">
                    <td className="py-1.5 text-ink">{EVENT_LABELS[row.kind]}</td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                      {row.current} / {row.previous}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <div className="space-y-3">
            {model.kindDeltas.map((row) => {
              const magnitude = Math.min(100, Math.abs(row.delta ?? 0))
              const positive = (row.delta ?? 0) >= 0
              return (
                <div key={row.kind}>
                  <div className="mb-1 flex items-baseline justify-between text-[13px]">
                    <span className="flex items-center gap-1.5 text-ink">
                      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: EVENT_COLOR_VAR[row.kind] }} />
                      {EVENT_LABELS[row.kind]}
                    </span>
                    <span
                      className="[font-variant-numeric:tabular-nums]"
                      style={{ color: row.delta === null ? 'var(--muted)' : positive ? 'var(--viz-good)' : 'var(--viz-bad)' }}
                    >
                      {row.delta === null ? `${row.current} / ${row.previous}` : `${positive ? '+' : ''}${row.delta.toFixed(0)}%`}
                    </span>
                  </div>
                  {/* Расходящаяся полоса от центра: вправо рост, влево спад */}
                  <div className="relative h-2.5 rounded-[4px] bg-[var(--sunken)]">
                    <span className="absolute left-1/2 top-0 h-full w-px bg-[var(--viz-axis)]" />
                    <div
                      className="absolute top-0 h-full rounded-[4px]"
                      style={{
                        width: `${magnitude / 2}%`,
                        left: positive ? '50%' : undefined,
                        right: positive ? undefined : '50%',
                        background: positive ? 'var(--viz-good)' : 'var(--viz-bad)',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="Кто поднимается и падает в рейтинге"
        subtitle="место участника по активности в каждом периоде — 1 сверху"
        table={
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[12px] text-faint">
                <th className="pb-1.5 font-medium">Участник</th>
                {model.rank.buckets.map((label) => (
                  <th key={label} className="pb-1.5 pl-2 text-right font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {model.rank.series.map((entry) => (
                <tr key={entry.handle} className="border-t border-line">
                  <td className="py-1.5 text-ink">{entry.handle}</td>
                  {entry.points.map((point, index) => (
                    <td key={index} className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                      {point.rank}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        {model.rank.series.length === 0 ? (
          <p className="text-[13px] text-muted">Недостаточно данных</p>
        ) : (
          <BumpChart
            series={model.rank.series}
            buckets={model.rank.buckets}
            depth={model.rank.depth}
            colors={SERIES_COLORS}
          />
        )}
      </ChartCard>

      <ChartCard
        title="Темп каждого участника"
        subtitle="одинаковый масштаб времени, разные люди — видно, кто разогнался, а кто затих"
        table={
          <table className="w-full text-[13px]">
            <tbody>
              {model.perPersonSeries.map((entry) => (
                <tr key={entry.label} className="border-t border-line">
                  <td className="py-1.5 text-ink">{entry.label}</td>
                  <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                    {entry.total}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <SmallMultiples items={model.perPersonSeries} />
      </ChartCard>
    </div>
  )
}
