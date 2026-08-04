import { useEffect, useMemo, useState } from 'react'
import { ipc } from '@/lib/ipc'
import type { FigmaOverviewEntry } from '@/types'
import { Avatar, Spinner } from '@/components/ui'
import { AppIcon } from '@/components/AppIcon'
import { FigmaIcon } from '@/components/FigmaIcon'
import { daysSince, formatDurationMs, relativeTime } from './utils'

export function FigmaOverview({
  onOpenFile,
  refreshSignal,
}: {
  onOpenFile: (key: string, name: string) => void
  refreshSignal: number
}) {
  const [entries, setEntries] = useState<FigmaOverviewEntry[] | null>(null)

  useEffect(() => {
    ipc.figmaOverview().then(setEntries)
  }, [refreshSignal])

  const stats = useMemo(() => computeStats(entries ?? []), [entries])

  if (entries === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-5 w-5" />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted">
        <FigmaIcon size={32} className="text-faint" />
        <p className="max-w-[320px] text-[14px] leading-relaxed">
          Дашборд собирается из файлов, которые вы открывали. Выберите файл слева в дереве команды
          — и здесь появится сводка по активности, комментариям и участникам.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Файлов отслеживается" value={String(stats.totalFiles)} />
        <StatCard label="Открытых комментариев" value={String(stats.openComments)} tone={stats.openComments > 0 ? 'warning' : undefined} />
        <StatCard
          label="Среднее время ответа"
          value={stats.avgResolutionMs !== null ? formatDurationMs(stats.avgResolutionMs) : '—'}
        />
        <StatCard label="Файлов без изменений 14+ дней" value={String(stats.staleFiles.length)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-card bg-surface p-4">
          <h3 className="mb-3 text-[13px] font-semibold text-ink">Активность по людям</h3>
          <div className="space-y-2">
            {stats.contributors.length === 0 ? (
              <p className="text-[12px] text-faint">Пока нет данных</p>
            ) : (
              stats.contributors.map((person) => (
                <div key={person.handle} className="flex items-center gap-2.5">
                  <Avatar src={person.img_url} name={person.handle} size={24} />
                  <span className="flex-1 truncate text-[13px] text-ink">{person.handle}</span>
                  <span className="text-[12px] text-faint">
                    {person.versions} сохранений · {person.comments} комментариев
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-card bg-surface p-4">
          <h3 className="mb-3 text-[13px] font-semibold text-ink">Недавно изменённые файлы</h3>
          <div className="space-y-1">
            {stats.recent.map((entry) => (
              <button
                key={entry.fileKey}
                type="button"
                onClick={() => onOpenFile(entry.fileKey, entry.meta.name ?? entry.fileKey)}
                className="flex h-8 w-full items-center gap-2 rounded-control px-2 text-left text-[13px] text-ink hover:bg-[var(--sunken)]"
              >
                <span className="flex-1 truncate">{entry.meta.name ?? entry.fileKey}</span>
                <span className="shrink-0 text-[11px] text-faint">
                  {entry.meta.lastModified ? relativeTime(entry.meta.lastModified) : '—'}
                </span>
              </button>
            ))}
          </div>
        </section>
      </div>

      {stats.staleFiles.length > 0 ? (
        <section className="rounded-card bg-surface p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            <AppIcon name="CalendarOff" size={15} className="text-[var(--danger)]" />
            Забытые файлы
          </h3>
          <div className="space-y-1">
            {stats.staleFiles.map((entry) => (
              <button
                key={entry.fileKey}
                type="button"
                onClick={() => onOpenFile(entry.fileKey, entry.meta.name ?? entry.fileKey)}
                className="flex h-8 w-full items-center gap-2 rounded-control px-2 text-left text-[13px] text-ink hover:bg-[var(--sunken)]"
              >
                <span className="flex-1 truncate">{entry.meta.name ?? entry.fileKey}</span>
                <span className="shrink-0 text-[11px] text-faint">
                  {entry.meta.lastModified ? `${daysSince(entry.meta.lastModified)} дн. без изменений` : ''}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'warning' }) {
  return (
    <div className="rounded-card bg-surface p-4">
      <p className="text-[12px] text-muted">{label}</p>
      <p className={tone === 'warning' ? 'mt-1 text-[24px] font-bold text-[var(--danger)]' : 'mt-1 text-[24px] font-bold text-ink'}>
        {value}
      </p>
    </div>
  )
}

function computeStats(entries: FigmaOverviewEntry[]) {
  const allComments = entries.flatMap((e) => e.comments)
  const openComments = allComments.filter((c) => !c.resolved_at).length
  const resolved = allComments.filter((c) => c.resolved_at)
  const avgResolutionMs = resolved.length
    ? resolved.reduce(
        (sum, c) => sum + (new Date(c.resolved_at as string).getTime() - new Date(c.created_at).getTime()),
        0,
      ) / resolved.length
    : null

  const contributorMap = new Map<string, { handle: string; img_url: string; versions: number; comments: number }>()
  for (const entry of entries) {
    for (const version of entry.versions) {
      const key = version.user.handle
      const existing = contributorMap.get(key) ?? { handle: key, img_url: version.user.img_url, versions: 0, comments: 0 }
      existing.versions += 1
      contributorMap.set(key, existing)
    }
    for (const comment of entry.comments) {
      const key = comment.user.handle
      const existing = contributorMap.get(key) ?? { handle: key, img_url: comment.user.img_url, versions: 0, comments: 0 }
      existing.comments += 1
      contributorMap.set(key, existing)
    }
  }
  const contributors = [...contributorMap.values()]
    .sort((a, b) => b.versions + b.comments - (a.versions + a.comments))
    .slice(0, 6)

  const withMeta = entries.filter((e) => e.meta.lastModified)
  const recent = [...withMeta]
    .sort((a, b) => new Date(b.meta.lastModified as string).getTime() - new Date(a.meta.lastModified as string).getTime())
    .slice(0, 8)
  const staleFiles = withMeta
    .filter((e) => daysSince(e.meta.lastModified as string) >= 14)
    .sort((a, b) => daysSince(b.meta.lastModified as string) - daysSince(a.meta.lastModified as string))

  return { totalFiles: entries.length, openComments, avgResolutionMs, contributors, recent, staleFiles }
}
