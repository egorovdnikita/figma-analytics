import { useMemo } from 'react'
import type { FigmaEvent } from '@/types'
import {
  AnalyticsPrefs,
  Bucket,
  DEFAULT_PREFS,
  EVENT_COLOR_VAR,
  EVENT_KINDS,
  EVENT_LABELS,
  Granularity,
  PREVIOUS_LABEL,
  WINDOW_LABEL,
  buildTimeline,
  byField,
  compareWindows,
  countKind,
  deltaPercent,
  hourDistribution,
  mean,
  perPersonStats,
  resolutionSpeed,
  uniqueBy,
  weekHourMatrix,
} from './analytics'
import { ChartCard, ComparisonBars, Donut, HBars, Heatmap, Legend, LineChart, StackedBars, StatTile } from './charts'
import { formatDurationMs } from './utils'

export function DashboardPanel({
  events,
  granularity,
  prefs = DEFAULT_PREFS,
  onOpenFile,
}: {
  events: FigmaEvent[]
  granularity: Granularity
  prefs?: AnalyticsPrefs
  onOpenFile: (key: string, name: string) => void
}) {
  const model = useMemo(() => buildModel(events, granularity, prefs), [events, granularity, prefs])

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <StatTile
          label="Событий всего"
          value={String(model.current.total)}
          delta={model.delta.total}
          deltaLabel={PREVIOUS_LABEL[granularity]}
          spark={model.spark.total}
        />
        <StatTile
          label="Сохранений"
          value={String(model.current.version)}
          delta={model.delta.version}
          deltaLabel={PREVIOUS_LABEL[granularity]}
          spark={model.spark.version}
        />
        <StatTile
          label="Комментариев"
          value={String(model.current.comment)}
          delta={model.delta.comment}
          deltaLabel={PREVIOUS_LABEL[granularity]}
          spark={model.spark.comment}
        />
        <StatTile
          label="Активных участников"
          value={String(model.current.people)}
          delta={model.delta.people}
          deltaLabel={PREVIOUS_LABEL[granularity]}
          spark={model.spark.people}
        />
        <StatTile
          label="Файлов затронуто"
          value={String(model.current.files)}
          delta={model.delta.files}
          deltaLabel={PREVIOUS_LABEL[granularity]}
          spark={model.spark.files}
        />
        <StatTile
          label="Обсуждений закрыто"
          value={String(model.current.resolve)}
          delta={model.delta.resolve}
          deltaLabel={PREVIOUS_LABEL[granularity]}
          spark={model.spark.resolve}
        />
        <StatTile
          label="Среднее время закрытия"
          value={model.current.resolutionMs !== null ? formatDurationMs(model.current.resolutionMs) : '—'}
          delta={model.delta.resolutionMs}
          deltaLabel={PREVIOUS_LABEL[granularity]}
          invertDelta
          hint="меньше — лучше"
        />
        <StatTile
          label="Реакций"
          value={String(model.current.reaction)}
          delta={model.delta.reaction}
          deltaLabel={PREVIOUS_LABEL[granularity]}
          spark={model.spark.reaction}
        />
      </div>

      <ChartCard
        title="Активность по типам событий"
        subtitle={`${model.timeline.length} периодов · гранулярность: ${granularity === 'day' ? 'сутки' : granularity === 'week' ? 'неделя' : granularity === 'month' ? 'месяц' : 'год'}`}
        legend={<Legend items={EVENT_KINDS.map((kind) => ({ label: EVENT_LABELS[kind], color: EVENT_COLOR_VAR[kind] }))} />}
        table={<TimelineTable buckets={model.timeline} />}
      >
        <StackedBars
          buckets={model.timeline.map((bucket) => ({ key: bucket.key, label: bucket.label }))}
          series={EVENT_KINDS.map((kind) => ({
            name: EVENT_LABELS[kind],
            color: EVENT_COLOR_VAR[kind],
            values: model.timeline.map((bucket) => bucket.counts[kind]),
          }))}
        />
      </ChartCard>

      <div className="grid grid-cols-2 gap-3">
        <ChartCard
          title="Сколько людей были активны"
          subtitle="уникальные участники в каждом периоде"
          table={
            <SimpleTable
              head={['Период', 'Участников']}
              rows={model.timeline.map((bucket, i) => [bucket.label, String(model.activePeople[i])])}
            />
          }
        >
          <LineChart
            area
            series={[
              {
                name: 'Участников',
                color: 'var(--viz-1)',
                points: model.timeline.map((bucket, i) => ({ label: bucket.label, value: model.activePeople[i] })),
              },
            ]}
          />
        </ChartCard>

        <ChartCard
          title="Текущий период против прошлого"
          subtitle={`${WINDOW_LABEL[granularity]} ${PREVIOUS_LABEL[granularity]}`}
          table={
            <SimpleTable
              head={['Тип', 'Сейчас', 'Прошлый']}
              rows={EVENT_KINDS.map((kind) => [
                EVENT_LABELS[kind],
                String(model.current[kind]),
                String(model.previous[kind]),
              ])}
            />
          }
        >
          <ComparisonBars
            currentLabel={`Текущий период (${WINDOW_LABEL[granularity]})`}
            previousLabel="Предыдущий период"
            items={EVENT_KINDS.map((kind) => ({
              label: EVENT_LABELS[kind],
              current: model.current[kind],
              previous: model.previous[kind],
            }))}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ChartCard
          title="Когда команда работает"
          subtitle="день недели × час, по всем событиям"
          table={
            <SimpleTable
              head={['День', 'Событий']}
              rows={model.heat.rows.map((row, i) => [row, String(model.heat.grid[i].reduce((a, b) => a + b, 0))])}
            />
          }
        >
          <Heatmap rows={model.heat.rows} grid={model.heat.grid} max={model.heat.max} />
        </ChartCard>

        <ChartCard
          title="Из чего складывается активность"
          subtitle={`всего событий за период: ${model.current.total}`}
          table={
            <SimpleTable
              head={['Тип', 'Событий']}
              rows={EVENT_KINDS.map((kind) => [EVENT_LABELS[kind], String(model.current[kind])])}
            />
          }
        >
          <Donut
            centerValue={String(model.current.total)}
            centerLabel="событий"
            segments={EVENT_KINDS.filter((kind) => model.current[kind] > 0).map((kind) => ({
              label: EVENT_LABELS[kind],
              value: model.current[kind],
              color: EVENT_COLOR_VAR[kind],
            }))}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ChartCard
          title="Самые активные файлы"
          subtitle="по числу событий за период"
          table={<SimpleTable head={['Файл', 'Событий']} rows={model.topFiles.map((f) => [f.label, String(f.value)])} />}
        >
          <HBars items={model.topFiles} />
          {model.topFiles.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {model.topFiles.slice(0, 5).map((file) => (
                <button
                  key={file.key}
                  type="button"
                  onClick={() => onOpenFile(file.key, file.label)}
                  className="rounded-chip bg-[var(--sunken)] px-2 py-1 text-[11px] text-muted hover:text-ink"
                >
                  Открыть: {file.label}
                </button>
              ))}
            </div>
          ) : null}
        </ChartCard>

        <ChartCard
          title="Активность по проектам"
          subtitle="события за период"
          table={
            <SimpleTable head={['Проект', 'Событий']} rows={model.topProjects.map((p) => [p.label, String(p.value)])} />
          }
        >
          <HBars items={model.topProjects} color="var(--viz-3)" />
        </ChartCard>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ChartCard
          title="Кто сделал больше всего"
          subtitle="участники по числу событий за период"
          table={
            <SimpleTable
              head={['Участник', 'Событий']}
              rows={model.topPeople.map((person) => [person.label, String(person.value)])}
            />
          }
        >
          {model.topPeople.length === 0 ? (
            <p className="text-[12px] text-muted">За период активности не было</p>
          ) : (
            <HBars items={model.topPeople} color="var(--viz-5)" />
          )}
        </ChartCard>

        <ChartCard
          title="Распределение по часам суток"
          subtitle="все события за всю историю"
          table={
            <SimpleTable
              head={['Час', 'Событий']}
              rows={model.hours.map((value, hour) => [`${String(hour).padStart(2, '0')}:00`, String(value)])}
            />
          }
        >
          <StackedBars
            height={180}
            buckets={model.hours.map((_, hour) => ({
              key: String(hour),
              label: `${String(hour).padStart(2, '0')}`,
            }))}
            series={[{ name: 'События', color: 'var(--viz-1)', values: model.hours }]}
          />
        </ChartCard>
      </div>

      {model.topTeams.length > 1 ? (
        <ChartCard
          title="Активность по командам"
          subtitle="события за период"
          table={
            <SimpleTable head={['Команда', 'Событий']} rows={model.topTeams.map((t) => [t.label, String(t.value)])} />
          }
        >
          <HBars items={model.topTeams} color="var(--viz-2)" />
        </ChartCard>
      ) : null}
    </div>
  )
}

/* ---------- таблицы значений (обязательная опора для каждого графика) ---------- */

function SimpleTable({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <table className="w-full text-[12px]">
      <thead>
        <tr className="text-left text-[11px] text-faint">
          {head.map((cell, i) => (
            <th key={cell} className={i === 0 ? 'pb-1.5 font-medium' : 'pb-1.5 pl-2 text-right font-medium'}>
              {cell}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index} className="border-t border-line">
            {row.map((cell, i) => (
              <td
                key={i}
                className={
                  i === 0
                    ? 'py-1.5 text-ink'
                    : 'py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]'
                }
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TimelineTable({ buckets }: { buckets: Bucket[] }) {
  return (
    <SimpleTable
      head={['Период', ...EVENT_KINDS.map((kind) => EVENT_LABELS[kind]), 'Всего']}
      rows={buckets.map((bucket) => [
        bucket.label,
        ...EVENT_KINDS.map((kind) => String(bucket.counts[kind])),
        String(bucket.total),
      ])}
    />
  )
}

/* ---------- модель ---------- */

function windowSummary(events: FigmaEvent[]) {
  const durations = resolutionSpeed(events)
  return {
    total: events.length,
    version: countKind(events, 'version'),
    comment: countKind(events, 'comment'),
    reply: countKind(events, 'reply'),
    resolve: countKind(events, 'resolve'),
    reaction: countKind(events, 'reaction'),
    people: uniqueBy(events.filter((e) => e.handle), (e) => e.handle),
    files: uniqueBy(events, (e) => e.fileKey),
    resolutionMs: mean(durations),
  }
}

function buildModel(events: FigmaEvent[], granularity: Granularity, prefs: AnalyticsPrefs) {
  const timeline = buildTimeline(events, granularity)
  const { current, previous } = compareWindows(events, granularity)

  const currentSummary = windowSummary(current.events)
  const previousSummary = windowSummary(previous.events)

  // Уникальные участники в каждой корзине таймлайна
  const activePeople = timeline.map((bucket) => {
    const set = new Set<string>()
    for (const event of events) {
      if (!event.handle) continue
      const ts = new Date(event.ts).getTime()
      if (ts >= bucket.start.getTime() && ts < bucket.end.getTime()) set.add(event.handle)
    }
    return set.size
  })

  const spark = {
    total: timeline.map((b) => b.total),
    version: timeline.map((b) => b.counts.version),
    comment: timeline.map((b) => b.counts.comment),
    resolve: timeline.map((b) => b.counts.resolve),
    reaction: timeline.map((b) => b.counts.reaction),
    people: activePeople,
    files: timeline.map((bucket) => {
      const set = new Set<string>()
      for (const event of events) {
        const ts = new Date(event.ts).getTime()
        if (ts >= bucket.start.getTime() && ts < bucket.end.getTime()) set.add(event.fileKey)
      }
      return set.size
    }),
  }

  const fileNames = new Map<string, string>()
  for (const event of current.events) fileNames.set(event.fileKey, event.fileName)

  const topFiles = byField(current.events, (event) => event.fileKey)
    .slice(0, 8)
    .map((entry) => ({ key: entry.key, label: fileNames.get(entry.key) ?? entry.key, value: entry.count }))

  const topProjects = byField(current.events, (event) => event.projectName || undefined)
    .slice(0, 8)
    .map((entry) => ({ label: entry.key, value: entry.count }))

  const topTeams = byField(current.events, (event) => event.teamName || undefined)
    .slice(0, 8)
    .map((entry) => ({ label: entry.key, value: entry.count }))

  const topPeople = perPersonStats(current.events, prefs)
    .slice(0, 8)
    .map((person) => ({ label: person.handle, value: person.total }))

  return {
    topTeams,
    topPeople,
    hours: hourDistribution(events),
    timeline,
    activePeople,
    spark,
    current: currentSummary,
    previous: previousSummary,
    delta: {
      total: deltaPercent(currentSummary.total, previousSummary.total),
      version: deltaPercent(currentSummary.version, previousSummary.version),
      comment: deltaPercent(currentSummary.comment, previousSummary.comment),
      resolve: deltaPercent(currentSummary.resolve, previousSummary.resolve),
      reaction: deltaPercent(currentSummary.reaction, previousSummary.reaction),
      people: deltaPercent(currentSummary.people, previousSummary.people),
      files: deltaPercent(currentSummary.files, previousSummary.files),
      resolutionMs:
        currentSummary.resolutionMs !== null && previousSummary.resolutionMs !== null
          ? deltaPercent(currentSummary.resolutionMs, previousSummary.resolutionMs)
          : undefined,
    },
    heat: weekHourMatrix(events),
    topFiles,
    topProjects,
    people: perPersonStats(current.events, prefs),
  }
}
