import { useMemo, useState } from 'react'
import type { FigmaEvent, FigmaFileIndexEntry } from '@/types'
import { Input } from '@/components/ui'
import { AppIcon } from '@/components/AppIcon'
import { Granularity, compareWindows, deltaPercent } from './analytics'
import { ChartCard, EmptyBlock, HBars } from './charts'
import { daysSince, relativeTime } from './utils'
import { cn } from '@/lib/cn'

type SortKey = 'activity' | 'name' | 'modified' | 'versions' | 'comments' | 'open'

export function FilesPanel({
  files,
  events,
  granularity,
  onOpenFile,
}: {
  files: FigmaFileIndexEntry[]
  events: FigmaEvent[]
  granularity: Granularity
  onOpenFile: (key: string, name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('activity')

  const { current, previous } = useMemo(() => compareWindows(events, granularity), [events, granularity])

  const activityByFile = useMemo(() => {
    const map = new Map<string, number>()
    for (const event of current.events) map.set(event.fileKey, (map.get(event.fileKey) ?? 0) + 1)
    return map
  }, [current.events])

  const previousByFile = useMemo(() => {
    const map = new Map<string, number>()
    for (const event of previous.events) map.set(event.fileKey, (map.get(event.fileKey) ?? 0) + 1)
    return map
  }, [previous.events])

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const list = files
      .filter(
        (file) =>
          !needle ||
          file.name.toLowerCase().includes(needle) ||
          file.projectName.toLowerCase().includes(needle),
      )
      .map((file) => ({
        ...file,
        activity: activityByFile.get(file.fileKey) ?? 0,
        delta: deltaPercent(activityByFile.get(file.fileKey) ?? 0, previousByFile.get(file.fileKey) ?? 0),
      }))

    switch (sort) {
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      case 'modified':
        return list.sort((a, b) => (b.lastModified ?? '').localeCompare(a.lastModified ?? ''))
      case 'versions':
        return list.sort((a, b) => b.versions - a.versions)
      case 'comments':
        return list.sort((a, b) => b.comments - a.comments)
      case 'open':
        return list.sort((a, b) => b.openComments - a.openComments)
      default:
        return list.sort((a, b) => b.activity - a.activity)
    }
  }, [files, query, sort, activityByFile, previousByFile])

  const stale = rows.filter((file) => file.lastModified && daysSince(file.lastModified) >= 30)

  if (files.length === 0) {
    return (
      <EmptyBlock
        icon={<AppIcon name="CalendarDays" size={22} />}
        title="Файлов нет"
        description="Запустите синхронизацию, чтобы собрать пространство."
      />
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <ChartCard
          title="Самые нагруженные файлы"
          subtitle="События за текущий период"
          table={
            <table className="w-full text-[13px]">
              <tbody>
                {rows.slice(0, 12).map((file) => (
                  <tr key={file.fileKey} className="border-t border-line">
                    <td className="py-1.5 text-ink">{file.name}</td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                      {file.activity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <HBars items={rows.slice(0, 8).map((file) => ({ label: file.name, value: file.activity }))} />
        </ChartCard>

        <ChartCard
          title="Открытых обсуждений"
          subtitle="Файлы с незакрытыми комментариями"
          table={
            <table className="w-full text-[13px]">
              <tbody>
                {rows
                  .filter((f) => f.openComments > 0)
                  .slice(0, 12)
                  .map((file) => (
                    <tr key={file.fileKey} className="border-t border-line">
                      <td className="py-1.5 text-ink">{file.name}</td>
                      <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                        {file.openComments}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          }
        >
          <HBars
            color="var(--viz-2)"
            items={[...rows]
              .sort((a, b) => b.openComments - a.openComments)
              .slice(0, 8)
              .map((file) => ({ label: file.name, value: file.openComments }))}
          />
        </ChartCard>
      </div>

      <div className="viz rounded-card bg-surface p-4">
        <div className="mb-3 flex items-center gap-3">
          <h3 className="text-[14px] font-semibold text-ink">Все файлы ({rows.length})</h3>
          <div className="ml-auto w-[240px]">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по файлам и проектам…"
              className="h-8 text-[13px]"
            />
          </div>
        </div>

        <div className="scroll-thin max-h-[520px] overflow-auto pt-1">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-surface">
              <tr className="text-left text-[12px] text-faint">
                <SortHeader label="Файл" active={sort === 'name'} onClick={() => setSort('name')} />
                <th className="pb-2 pl-2 font-medium">Проект</th>
                <SortHeader label="Событий" align="right" active={sort === 'activity'} onClick={() => setSort('activity')} />
                <th className="pb-2 pl-2 text-right font-medium">Δ</th>
                <SortHeader label="Версий" align="right" active={sort === 'versions'} onClick={() => setSort('versions')} />
                <SortHeader label="Комм." align="right" active={sort === 'comments'} onClick={() => setSort('comments')} />
                <SortHeader label="Открыто" align="right" active={sort === 'open'} onClick={() => setSort('open')} />
                <SortHeader label="Изменён" align="right" active={sort === 'modified'} onClick={() => setSort('modified')} />
              </tr>
            </thead>
            <tbody>
              {rows.map((file) => (
                <tr
                  key={file.fileKey}
                  className="cursor-pointer border-t border-line hover:bg-[var(--sunken)]"
                  onClick={() => onOpenFile(file.fileKey, file.name)}
                >
                  <td className="max-w-[240px] truncate py-2 text-ink" title={file.name}>
                    {file.name}
                  </td>
                  <td className="max-w-[160px] truncate py-2 pl-2 text-muted">{file.projectName || '—'}</td>
                  <td className="py-2 pl-2 text-right text-ink [font-variant-numeric:tabular-nums]">{file.activity}</td>
                  <td
                    className="py-2 pl-2 text-right [font-variant-numeric:tabular-nums]"
                    style={{
                      color:
                        file.delta === null ? 'var(--muted)' : file.delta >= 0 ? 'var(--viz-good)' : 'var(--viz-bad)',
                    }}
                  >
                    {file.delta === null ? '—' : `${file.delta > 0 ? '+' : ''}${file.delta.toFixed(0)}%`}
                  </td>
                  <td className="py-2 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                    {file.versions}
                    {!file.versionsComplete ? <span title="История подгружена не полностью">+</span> : null}
                  </td>
                  <td className="py-2 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">{file.comments}</td>
                  <td className="py-2 pl-2 text-right [font-variant-numeric:tabular-nums]" style={{ color: file.openComments > 0 ? 'var(--viz-bad)' : undefined }}>
                    {file.openComments}
                  </td>
                  <td className="py-2 pl-2 text-right text-muted">
                    {file.lastModified ? relativeTime(file.lastModified) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {stale.length > 0 ? (
        <section className="rounded-card bg-surface p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-[14px] font-semibold text-ink">
            <AppIcon name="CalendarOff" size={15} className="text-[var(--danger)]" />
            Заброшенные файлы — 30+ дней без изменений ({stale.length})
          </h3>
          <div className="space-y-1">
            {stale.slice(0, 12).map((file) => (
              <button
                key={file.fileKey}
                type="button"
                onClick={() => onOpenFile(file.fileKey, file.name)}
                className="flex h-8 w-full items-center gap-2 rounded-control px-2 text-left text-[13.5px] text-ink hover:bg-[var(--sunken)]"
              >
                <span className="flex-1 truncate">{file.name}</span>
                <span className="shrink-0 text-[12px] text-faint">
                  {file.lastModified ? `${daysSince(file.lastModified)} дн.` : ''}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function SortHeader({
  label,
  active,
  onClick,
  align = 'left',
}: {
  label: string
  active: boolean
  onClick: () => void
  align?: 'left' | 'right'
}) {
  return (
    <th className={cn('pb-2 font-medium', align === 'right' ? 'pl-2 text-right' : '')}>
      <button
        type="button"
        onClick={onClick}
        className={cn('transition-colors hover:text-ink', active ? 'text-ink' : '')}
      >
        {label}
        {active ? ' ↓' : ''}
      </button>
    </th>
  )
}
