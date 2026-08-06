import { useMemo } from 'react'
import type { FigmaEvent, FigmaFileIndexEntry } from '@/types'
import { AppIcon } from '@/components/AppIcon'
import {
  AnalyticsPrefs,
  DEFAULT_PREFS,
  FILE_STAGE_LABELS,
  FileStage,
  Granularity,
  Insight,
  InsightThresholds,
  InsightTone,
  PREVIOUS_LABEL,
  WINDOW_LABEL,
  anomalies,
  buildThreads,
  buildTimeline,
  burnoutSignals,
  collaborationGraph,
  compareWindows,
  fileLifecycle,
  forecast,
  generateInsights,
  healthScore,
  perPersonStats,
  responseTimeByPerson,
  retentionCohorts,
} from './analytics'
import { ChartCard, CohortGrid, EmptyBlock, ForecastChart, HBars, HealthRing, Histogram, NetworkGraph, StageFunnel } from './charts'
import { formatDurationMs } from './utils'

const TONE_STYLE: Record<InsightTone, { bg: string; fg: string; icon: React.ComponentProps<typeof AppIcon>['name'] }> = {
  good: { bg: 'var(--grass-soft)', fg: 'var(--viz-good)', icon: 'Check' },
  warning: { bg: 'var(--sunken)', fg: 'var(--viz-4)', icon: 'Bell' },
  critical: { bg: 'var(--sunken)', fg: 'var(--viz-bad)', icon: 'ShieldOff' },
  neutral: { bg: 'var(--sunken)', fg: 'var(--muted)', icon: 'AlignLeft' },
}

const STAGE_COLORS: Record<FileStage, string> = {
  active: 'var(--viz-good)',
  slowing: 'var(--viz-4)',
  frozen: 'var(--viz-2)',
  dead: 'var(--viz-bad)',
}

/** Панель с готовыми наблюдениями: не «вот вам графики, разбирайтесь», а
 * сформулированные выводы, каждый со ссылкой на конкретное число. */
export function InsightsPanel({
  events,
  files,
  granularity,
  prefs = DEFAULT_PREFS,
  thresholds,
  onOpenFile,
}: {
  events: FigmaEvent[]
  files: FigmaFileIndexEntry[]
  granularity: Granularity
  prefs?: AnalyticsPrefs
  thresholds?: InsightThresholds
  onOpenFile: (key: string, name: string) => void
}) {
  const model = useMemo(() => {
    const { current, previous } = compareWindows(events, granularity)
    const threads = buildThreads(events)
    const people = perPersonStats(events, prefs)
    const timeline = buildTimeline(events, granularity)
    const totals = timeline.map((bucket) => ({ label: bucket.label, value: bucket.total }))
    const lifecycle = fileLifecycle(events)
    const anomalyList = anomalies(totals)

    return {
      insights: generateInsights({
        currentEvents: current.events,
        previousEvents: previous.events,
        allEvents: events,
        people,
        threads,
        lifecycle,
        anomalyList,
        windowLabel: WINDOW_LABEL[granularity],
        previousLabel: PREVIOUS_LABEL[granularity],
        thresholds,
      }),
      health: healthScore({
        currentEvents: current.events,
        previousEvents: previous.events,
        allEvents: events,
        threads,
        people,
        staleFiles: lifecycle.buckets.frozen + lifecycle.buckets.dead,
        totalFiles: lifecycle.rows.length || files.length,
      }),
      forecastPoints: forecast(totals, 4),
      anomalyList,
      lifecycle,
      cohorts: retentionCohorts(events, 12),
      responders: responseTimeByPerson(threads),
      burnout: burnoutSignals(people),
      graph: collaborationGraph(events, 12),
      responseValues: threads
        .map((thread) => thread.responseMs)
        .filter((ms): ms is number => ms !== null)
        .map((ms) => ms / 3600000),
    }
  }, [events, files.length, granularity, prefs, thresholds])

  if (events.length === 0) {
    return (
      <EmptyBlock
        icon={<AppIcon name="Bell" size={22} />}
        title="Выводов пока нет"
        description="В текущей выборке недостаточно событий. Ослабьте фильтры или запустите синхронизацию."
      />
    )
  }

  return (
    <div className="space-y-3">
      <ChartCard
        title="Пульс пространства"
        subtitle="Сводный индекс из пяти наблюдаемых признаков — каждый виден отдельно"
        table={
          <table className="w-full text-[13px]">
            <tbody>
              {model.health.factors.map((factor) => (
                <tr key={factor.key} className="border-t border-line">
                  <td className="py-1.5 text-ink">{factor.label}</td>
                  <td className="py-1.5 pl-2 text-muted">{factor.detail}</td>
                  <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                    {Math.round(factor.score)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <HealthRing score={model.health.score} factors={model.health.factors} />
      </ChartCard>

      <section className="rounded-card bg-surface p-4">
        <h3 className="mb-1 text-[14px] font-semibold text-ink">Что происходит</h3>
        <p className="mb-3 text-[12px] text-muted">
          Выводы собраны автоматически по текущей выборке. Пороги настраиваются в разделе «Настройки».
        </p>
        <div className="grid grid-cols-2 gap-2">
          {model.insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <ChartCard
          title="Куда идёт активность"
          subtitle="Продолжение линейного тренда на 4 периода с коридором в одно σ"
          table={
            <table className="w-full text-[13px]">
              <tbody>
                {model.forecastPoints.map((point) => (
                  <tr key={point.label} className="border-t border-line">
                    <td className="py-1.5 text-ink">{point.label}</td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                      {point.value !== null
                        ? point.value
                        : `~${Math.round(point.predicted ?? 0)} (${Math.round(point.low ?? 0)}–${Math.round(point.high ?? 0)})`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <ForecastChart points={model.forecastPoints} />
          <p className="mt-2 text-[12px] leading-relaxed text-muted">
            Это экстраполяция уже наблюдаемого тренда, а не предсказание: на скачкообразных рядах коридор
            честно становится широким.
          </p>
        </ChartCard>

        <ChartCard
          title="Жизненный цикл файлов"
          subtitle="По давности последнего события"
          table={
            <table className="w-full text-[13px]">
              <tbody>
                {(Object.keys(FILE_STAGE_LABELS) as FileStage[]).map((stage) => (
                  <tr key={stage} className="border-t border-line">
                    <td className="py-1.5 text-ink">{FILE_STAGE_LABELS[stage]}</td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                      {model.lifecycle.buckets[stage]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <StageFunnel
            stages={(Object.keys(FILE_STAGE_LABELS) as FileStage[]).map((stage) => ({
              label: FILE_STAGE_LABELS[stage],
              value: model.lifecycle.buckets[stage],
              color: STAGE_COLORS[stage],
            }))}
          />
          <div className="mt-3 space-y-1 rounded-control bg-[var(--sunken)] p-2">
            {model.lifecycle.rows
              .filter((row) => row.stage === 'dead' || row.stage === 'frozen')
              .slice(0, 5)
              .map((row) => (
                <button
                  key={row.fileKey}
                  type="button"
                  onClick={() => onOpenFile(row.fileKey, row.name)}
                  className="flex h-7 w-full items-center gap-2 rounded-control px-2 text-left text-[13px] text-ink hover:bg-[var(--sunken)]"
                >
                  <span className="flex-1 truncate">{row.name}</span>
                  <span className="shrink-0 text-[12px] text-faint">{row.days} дн.</span>
                </button>
              ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ChartCard
          title="Как быстро отвечают"
          subtitle="Распределение времени до первого ответа, в часах"
          table={
            <table className="w-full text-[13px]">
              <tbody>
                {model.responders.map((row) => (
                  <tr key={row.handle} className="border-t border-line">
                    <td className="py-1.5 text-ink">{row.handle}</td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                      {formatDurationMs(row.median)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <Histogram
            values={model.responseValues}
            bins={12}
            formatBin={(value) => (value >= 24 ? `${Math.round(value / 24)}д` : `${Math.round(value)}ч`)}
            color="var(--viz-3)"
          />
          {model.responders.length > 0 ? (
            <div className="mt-3 rounded-control bg-[var(--sunken)] p-3">
              <p className="mb-2 text-[12px] text-muted">Медиана времени до ответа по людям</p>
              <HBars
                color="var(--viz-3)"
                items={model.responders.slice(0, 6).map((row) => ({
                  label: row.handle,
                  value: Math.round(row.median / 3600000),
                }))}
                formatValue={(value) => `${value} ч`}
              />
            </div>
          ) : null}
        </ChartCard>

        <ChartCard
          title="Признаки переработок"
          subtitle="Ночная работа, выходные и длинные серии без перерыва"
          table={
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[12px] text-faint">
                  <th className="pb-1.5 font-medium">Участник</th>
                  <th className="pb-1.5 pl-2 text-right font-medium">Ночью</th>
                  <th className="pb-1.5 pl-2 text-right font-medium">Выходные</th>
                  <th className="pb-1.5 pl-2 text-right font-medium">Серия</th>
                </tr>
              </thead>
              <tbody>
                {model.burnout.map((row) => (
                  <tr key={row.handle} className="border-t border-line">
                    <td className="py-1.5 text-ink">{row.handle}</td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                      {row.nightShare.toFixed(0)}%
                    </td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                      {row.weekendShare.toFixed(0)}%
                    </td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                      {row.streak}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          {model.burnout.length === 0 ? (
            <p className="text-[13px] text-muted">Недостаточно данных</p>
          ) : (
            <>
              <HBars
                color="var(--viz-4)"
                items={model.burnout.slice(0, 6).map((row) => ({
                  label: row.handle,
                  value: Math.round(row.risk),
                  hint: `ночью ${row.nightShare.toFixed(0)}%, выходные ${row.weekendShare.toFixed(0)}%`,
                }))}
                max={100}
              />
              <p className="mt-3 text-[12px] leading-relaxed text-muted">
                Это индикатор для разговора, а не диагноз: высокая доля ночных правок может означать и другой
                часовой пояс. Границы ночи и выходных задаются в настройках.
              </p>
            </>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Граф связей команды"
        subtitle="Кто с кем пересекается в файлах — толщина линии равна числу общих файлов"
        table={
          <table className="w-full text-[13px]">
            <tbody>
              {model.graph.edges.slice(0, 20).map((edge) => (
                <tr key={`${edge.source}|${edge.target}`} className="border-t border-line">
                  <td className="py-1.5 text-ink">
                    {edge.source} ↔ {edge.target}
                  </td>
                  <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                    {edge.weight}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <NetworkGraph nodes={model.graph.nodes} edges={model.graph.edges} />
      </ChartCard>

      <ChartCard
        title="Удержание участников по когортам"
        subtitle="Строка — месяц первого появления, столбец — сколько из них активны N месяцев спустя"
        table={
          <table className="w-full text-[13px]">
            <tbody>
              {model.cohorts.map((row) => (
                <tr key={row.cohort} className="border-t border-line">
                  <td className="py-1.5 text-ink">{row.cohort}</td>
                  <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                    {row.size} чел.
                  </td>
                  <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                    {row.cells.filter((cell) => cell !== null && cell > 0).length} активных месяцев
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        {model.cohorts.length === 0 ? (
          <p className="text-[13px] text-muted">Недостаточно истории для когорт</p>
        ) : (
          <CohortGrid rows={model.cohorts} />
        )}
      </ChartCard>
    </div>
  )
}

function InsightCard({ insight }: { insight: Insight }) {
  const tone = TONE_STYLE[insight.tone]
  return (
    <article className="flex gap-3 rounded-control p-3" style={{ background: tone.bg }}>
      <span
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{ background: 'var(--surface)', color: tone.fg }}
        aria-hidden
      >
        <AppIcon name={tone.icon} size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="text-[13.5px] font-semibold text-ink">{insight.title}</h4>
          {insight.metric ? (
            <span className="shrink-0 text-[13px] font-semibold [font-variant-numeric:tabular-nums]" style={{ color: tone.fg }}>
              {insight.metric}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{insight.detail}</p>
      </div>
    </article>
  )
}
