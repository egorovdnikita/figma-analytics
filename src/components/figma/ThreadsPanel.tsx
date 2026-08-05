import { useMemo, useState } from 'react'
import type { FigmaEvent } from '@/types'
import { Avatar, Input, Segmented } from '@/components/ui'
import {
  Granularity,
  PREVIOUS_LABEL,
  buildThreads,
  buildTimeline,
  byField,
  compareWindows,
  deltaPercent,
  mean,
  percentile,
} from './analytics'
import { ChartCard, Donut, HBars, LineChart, ScatterPlot, StatTile } from './charts'
import { emojiGlyph, formatDurationMs, relativeTime } from './utils'

type Filter = 'all' | 'open' | 'unanswered' | 'resolved'

/** Аналитика обсуждений: не сколько комментариев написали, а как быстро
 * команда на них отвечает и закрывает. */
export function ThreadsPanel({
  events,
  granularity,
  onOpenFile,
}: {
  events: FigmaEvent[]
  granularity: Granularity
  onOpenFile: (key: string, name: string) => void
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(40)

  const model = useMemo(() => {
    const threads = buildThreads(events)
    const { current, previous } = compareWindows(events, granularity)
    const currentThreads = buildThreads(current.events)
    const previousThreads = buildThreads(previous.events)

    const responses = threads.map((thread) => thread.responseMs).filter((ms): ms is number => ms !== null)
    const resolves = threads.map((thread) => thread.resolveMs).filter((ms): ms is number => ms !== null)

    const open = threads.filter((thread) => !thread.resolvedAt)
    const unanswered = threads.filter((thread) => thread.replies === 0 && !thread.resolvedAt)

    const timeline = buildTimeline(events, granularity)
    const openedByBucket = timeline.map((bucket) => {
      let opened = 0
      let closed = 0
      for (const thread of threads) {
        const ts = new Date(thread.openedAt).getTime()
        if (ts >= bucket.start.getTime() && ts < bucket.end.getTime()) opened += 1
        if (thread.resolvedAt) {
          const rts = new Date(thread.resolvedAt).getTime()
          if (rts >= bucket.start.getTime() && rts < bucket.end.getTime()) closed += 1
        }
      }
      return { label: bucket.label, opened, closed }
    })

    const emoji = byField(
      events.filter((event) => event.kind === 'reaction'),
      (event) => event.emoji,
    ).slice(0, 6)

    // Кто отвечает другим: считаем ответы в чужих ветках
    const responders = new Map<string, number>()
    for (const thread of threads) {
      for (const participant of thread.participants) {
        if (participant === thread.author) continue
        responders.set(participant, (responders.get(participant) ?? 0) + 1)
      }
    }

    const askers = byField(
      events.filter((event) => event.kind === 'comment'),
      (event) => event.handle || undefined,
    ).slice(0, 8)

    const byFile = new Map<string, { name: string; threads: number; open: number }>()
    for (const thread of threads) {
      const entry = byFile.get(thread.fileKey) ?? { name: thread.fileName, threads: 0, open: 0 }
      entry.threads += 1
      if (!thread.resolvedAt) entry.open += 1
      byFile.set(thread.fileKey, entry)
    }

    return {
      threads,
      open,
      unanswered,
      resolvedRate: threads.length > 0 ? ((threads.length - open.length) / threads.length) * 100 : 0,
      avgResponse: mean(responses),
      medianResponse: percentile(responses, 50),
      p90Response: percentile(responses, 90),
      avgResolve: mean(resolves),
      medianResolve: percentile(resolves, 50),
      openedByBucket,
      emoji,
      responders: [...responders.entries()]
        .map(([handle, count]) => ({ label: handle, value: count }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
      askers: askers.map((entry) => ({ label: entry.key, value: entry.count })),
      scatter: [...byFile.entries()].map(([key, entry]) => ({
        label: entry.name,
        x: entry.threads,
        y: entry.open,
        size: 5 + Math.min(7, entry.threads / 4),
        key,
      })),
      currentCount: currentThreads.length,
      previousCount: previousThreads.length,
    }
  }, [events, granularity])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return model.threads
      .filter((thread) => {
        if (filter === 'open' && thread.resolvedAt) return false
        if (filter === 'resolved' && !thread.resolvedAt) return false
        if (filter === 'unanswered' && (thread.replies > 0 || thread.resolvedAt)) return false
        if (!needle) return true
        return (
          thread.message.toLowerCase().includes(needle) ||
          thread.author.toLowerCase().includes(needle) ||
          thread.fileName.toLowerCase().includes(needle)
        )
      })
      .slice(0, limit)
  }, [model.threads, filter, query, limit])

  if (model.threads.length === 0) {
    return (
      <p className="rounded-card bg-surface p-6 text-center text-[14px] text-muted">
        Обсуждений в выборке нет. Ослабьте фильтры или запустите синхронизацию.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <StatTile
          label="Обсуждений всего"
          value={model.threads.length.toLocaleString('ru')}
          delta={deltaPercent(model.currentCount, model.previousCount)}
          deltaLabel={PREVIOUS_LABEL[granularity]}
        />
        <StatTile label="Открыто сейчас" value={String(model.open.length)} hint={`${model.resolvedRate.toFixed(0)}% закрыто`} />
        <StatTile
          label="Без единого ответа"
          value={String(model.unanswered.length)}
          hint="никто не откликнулся"
        />
        <StatTile
          label="Медиана до ответа"
          value={model.medianResponse !== null ? formatDurationMs(model.medianResponse) : '—'}
          hint="половина вопросов быстрее"
        />
        <StatTile
          label="Среднее до ответа"
          value={model.avgResponse !== null ? formatDurationMs(model.avgResponse) : '—'}
        />
        <StatTile
          label="90-й процентиль ответа"
          value={model.p90Response !== null ? formatDurationMs(model.p90Response) : '—'}
          hint="худшие 10% случаев"
        />
        <StatTile
          label="Медиана до закрытия"
          value={model.medianResolve !== null ? formatDurationMs(model.medianResolve) : '—'}
        />
        <StatTile
          label="Среднее до закрытия"
          value={model.avgResolve !== null ? formatDurationMs(model.avgResolve) : '—'}
        />
      </div>

      <ChartCard
        title="Открыто и закрыто по периодам"
        subtitle="если открывается стабильно больше, чем закрывается — долг обсуждений растёт"
        table={
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[12px] text-faint">
                <th className="pb-1.5 font-medium">Период</th>
                <th className="pb-1.5 pl-2 text-right font-medium">Открыто</th>
                <th className="pb-1.5 pl-2 text-right font-medium">Закрыто</th>
              </tr>
            </thead>
            <tbody>
              {model.openedByBucket.map((row) => (
                <tr key={row.label} className="border-t border-line">
                  <td className="py-1.5 text-ink">{row.label}</td>
                  <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">{row.opened}</td>
                  <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">{row.closed}</td>
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
              name: 'Открыто',
              color: 'var(--viz-2)',
              points: model.openedByBucket.map((row) => ({ label: row.label, value: row.opened })),
            },
            {
              name: 'Закрыто',
              color: 'var(--viz-3)',
              points: model.openedByBucket.map((row) => ({ label: row.label, value: row.closed })),
            },
          ]}
        />
      </ChartCard>

      <div className="grid grid-cols-3 gap-3">
        <ChartCard
          title="Кто задаёт вопросы"
          subtitle="авторы корневых обсуждений"
          table={
            <table className="w-full text-[13px]">
              <tbody>
                {model.askers.map((item) => (
                  <tr key={item.label} className="border-t border-line">
                    <td className="py-1.5 text-ink">{item.label}</td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <HBars items={model.askers} color="var(--viz-2)" />
        </ChartCard>

        <ChartCard
          title="Кто отвечает"
          subtitle="участие в чужих обсуждениях"
          table={
            <table className="w-full text-[13px]">
              <tbody>
                {model.responders.map((item) => (
                  <tr key={item.label} className="border-t border-line">
                    <td className="py-1.5 text-ink">{item.label}</td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">{item.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          {model.responders.length === 0 ? (
            <p className="text-[13px] text-muted">Ответов пока нет</p>
          ) : (
            <HBars items={model.responders} color="var(--viz-3)" />
          )}
        </ChartCard>

        <ChartCard
          title="Реакции"
          subtitle="какими эмодзи пользуется команда"
          table={
            <table className="w-full text-[13px]">
              <tbody>
                {model.emoji.map((item) => (
                  <tr key={item.key} className="border-t border-line">
                    <td className="py-1.5 text-ink">{emojiGlyph(item.key)}</td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          {model.emoji.length === 0 ? (
            <p className="text-[13px] text-muted">Реакций нет</p>
          ) : (
            <Donut
              size={112}
              centerValue={String(model.emoji.reduce((sum, item) => sum + item.count, 0))}
              centerLabel="реакций"
              segments={model.emoji.map((item, index) => ({
                label: emojiGlyph(item.key),
                value: item.count,
                color: `var(--viz-${(index % 5) + 1})`,
              }))}
            />
          )}
        </ChartCard>
      </div>

      <ChartCard
        title="Файлы: обсуждений против незакрытых"
        subtitle="точки справа-сверху — файлы с накопленным долгом обсуждений"
        table={
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-left text-[12px] text-faint">
                <th className="pb-1.5 font-medium">Файл</th>
                <th className="pb-1.5 pl-2 text-right font-medium">Обсуждений</th>
                <th className="pb-1.5 pl-2 text-right font-medium">Открыто</th>
              </tr>
            </thead>
            <tbody>
              {model.scatter.map((point) => (
                <tr key={point.key} className="border-t border-line">
                  <td className="py-1.5 text-ink">{point.label}</td>
                  <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">{point.x}</td>
                  <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">{point.y}</td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      >
        <ScatterPlot
          points={model.scatter}
          xLabel="всего обсуждений"
          yLabel="открытых"
          onSelect={(label) => {
            const found = model.scatter.find((point) => point.label === label)
            if (found) onOpenFile(found.key, found.label)
          }}
        />
      </ChartCard>

      <div className="viz rounded-card bg-surface p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h3 className="text-[14px] font-semibold text-ink">Обсуждения</h3>
          <Segmented
            value={filter}
            onChange={(value) => {
              setFilter(value as Filter)
              setLimit(40)
            }}
            options={[
              { value: 'all', label: 'Все' },
              { value: 'open', label: 'Открытые' },
              { value: 'unanswered', label: 'Без ответа' },
              { value: 'resolved', label: 'Закрытые' },
            ]}
            className="bg-[var(--sunken)]"
          />
          <div className="ml-auto w-[240px]">
            <Input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setLimit(40)
              }}
              placeholder="Поиск по тексту, автору, файлу…"
              className="h-8 text-[13px]"
            />
          </div>
        </div>

        <div className="space-y-1">
          {visible.map((thread) => (
            <button
              key={thread.id}
              type="button"
              onClick={() => onOpenFile(thread.fileKey, thread.fileName)}
              className="flex w-full items-start gap-2.5 rounded-control p-2 text-left hover:bg-[var(--sunken)]"
            >
              <Avatar src={thread.authorImg} name={thread.author} size={24} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] text-ink">
                  <span className="font-medium">{thread.author}</span>{' '}
                  <span className="text-muted">{thread.message || '(без текста)'}</span>
                </p>
                <p className="mt-0.5 text-[12px] text-faint">
                  {thread.fileName} · {thread.replies} ответов · {thread.reactions} реакций ·{' '}
                  {relativeTime(thread.openedAt)}
                </p>
              </div>
              <div className="w-[150px] shrink-0 text-right text-[12px]">
                {thread.resolvedAt ? (
                  <span style={{ color: 'var(--viz-good)' }}>
                    закрыто за {thread.resolveMs !== null ? formatDurationMs(thread.resolveMs) : '—'}
                  </span>
                ) : thread.replies === 0 ? (
                  <span style={{ color: 'var(--viz-bad)' }}>без ответа {thread.ageDays} дн.</span>
                ) : (
                  <span className="text-muted">
                    ответ через {thread.responseMs !== null ? formatDurationMs(thread.responseMs) : '—'}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {visible.length === 0 ? <p className="p-6 text-center text-[14px] text-muted">Ничего не найдено</p> : null}

        {visible.length === limit ? (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setLimit((value) => value + 40)}
              className="h-8 rounded-control px-3 text-[13px] text-muted hover:bg-[var(--sunken)] hover:text-ink"
            >
              Показать ещё
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
