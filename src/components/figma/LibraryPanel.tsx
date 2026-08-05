import { useEffect, useState } from 'react'
import { ipc } from '@/lib/ipc'
import type { FigmaLibrarySummary, FigmaTeamRef } from '@/types'
import { Avatar, Spinner } from '@/components/ui'
import { ChartCard, Donut, HBars } from './charts'
import { relativeTime } from './utils'

const KIND_LABELS: Record<'component' | 'component_set' | 'style', string> = {
  component: 'Компонент',
  component_set: 'Набор',
  style: 'Стиль',
}

export function LibraryPanel({ teams }: { teams: FigmaTeamRef[] }) {
  if (teams.length === 0) {
    return (
      <p className="rounded-card bg-surface p-6 text-center text-[14px] text-muted">
        Добавьте команду, чтобы увидеть её опубликованную библиотеку.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {teams.map((team) => (
        <TeamLibrary key={team.id} team={team} />
      ))}
    </div>
  )
}

function TeamLibrary({ team }: { team: FigmaTeamRef }) {
  const [summary, setSummary] = useState<FigmaLibrarySummary | 'error' | null>(null)

  useEffect(() => {
    let alive = true
    ipc
      .figmaTeamLibrary(team.id)
      .then((data) => alive && setSummary(data))
      .catch(() => alive && setSummary('error'))
    return () => {
      alive = false
    }
  }, [team.id])

  if (summary === null) {
    return (
      <div className="flex justify-center rounded-card bg-surface py-8">
        <Spinner className="h-4 w-4" />
      </div>
    )
  }

  if (summary === 'error') {
    return (
      <div className="rounded-card bg-surface p-4">
        <h3 className="text-[14px] font-semibold text-ink">{team.label || team.id}</h3>
        <p className="mt-1 text-[13px] text-muted">
          Библиотека недоступна: у токена нет прав на library-эндпоинты этой команды либо в ней нет
          опубликованных файлов.
        </p>
      </div>
    )
  }

  const total = summary.componentsCount + summary.componentSetsCount + summary.stylesCount

  if (total === 0) {
    return (
      <div className="rounded-card bg-surface p-4">
        <h3 className="text-[14px] font-semibold text-ink">{team.label || team.id}</h3>
        <p className="mt-1 text-[13px] text-muted">В команде нет опубликованной библиотеки.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="viz flex items-center justify-between rounded-card bg-surface p-4">
        <div>
          <h3 className="text-[14px] font-semibold text-ink">{team.label || team.id}</h3>
          <p className="mt-0.5 text-[12px] text-muted">
            {summary.lastPublished ? `Публиковалась ${relativeTime(summary.lastPublished)}` : 'Дата публикации неизвестна'}
          </p>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <p className="font-display display-md text-ink">{summary.componentsCount}</p>
            <p className="mt-1 text-[12px] text-muted">компонентов</p>
          </div>
          <div>
            <p className="font-display display-md text-ink">{summary.componentSetsCount}</p>
            <p className="mt-1 text-[12px] text-muted">наборов</p>
          </div>
          <div>
            <p className="font-display display-md text-ink">{summary.stylesCount}</p>
            <p className="mt-1 text-[12px] text-muted">стилей</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ChartCard
          title="Состав библиотеки"
          subtitle={`всего опубликовано: ${total}`}
          table={
            <table className="w-full text-[13px]">
              <tbody>
                <tr className="border-t border-line">
                  <td className="py-1.5 text-ink">Компоненты</td>
                  <td className="py-1.5 pl-2 text-right text-muted">{summary.componentsCount}</td>
                </tr>
                <tr className="border-t border-line">
                  <td className="py-1.5 text-ink">Наборы</td>
                  <td className="py-1.5 pl-2 text-right text-muted">{summary.componentSetsCount}</td>
                </tr>
                <tr className="border-t border-line">
                  <td className="py-1.5 text-ink">Стили</td>
                  <td className="py-1.5 pl-2 text-right text-muted">{summary.stylesCount}</td>
                </tr>
              </tbody>
            </table>
          }
        >
          <Donut
            centerValue={String(total)}
            centerLabel="единиц"
            segments={[
              { label: 'Компоненты', value: summary.componentsCount, color: 'var(--viz-1)' },
              { label: 'Наборы', value: summary.componentSetsCount, color: 'var(--viz-2)' },
              { label: 'Стили', value: summary.stylesCount, color: 'var(--viz-3)' },
            ].filter((segment) => segment.value > 0)}
          />
        </ChartCard>

        <ChartCard
          title="Кто ведёт дизайн-систему"
          subtitle="Публикации по авторам"
          table={
            <table className="w-full text-[13px]">
              <tbody>
                {summary.byAuthor.map((author) => (
                  <tr key={author.handle} className="border-t border-line">
                    <td className="py-1.5 text-ink">{author.handle}</td>
                    <td className="py-1.5 pl-2 text-right text-muted [font-variant-numeric:tabular-nums]">
                      {author.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          }
        >
          <HBars
            color="var(--viz-3)"
            items={summary.byAuthor.slice(0, 8).map((author) => ({ label: author.handle, value: author.count }))}
          />
        </ChartCard>
      </div>

      <section className="rounded-card bg-surface p-4">
        <h3 className="mb-3 text-[14px] font-semibold text-ink">Последние публикации</h3>
        <div className="space-y-1">
          {summary.recent.map((item) => (
            <div key={item.key} className="flex items-center gap-2.5 rounded-control px-2 py-1.5">
              <Avatar src={item.user.img_url} name={item.user.handle} size={22} />
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{item.name}</span>
              <span className="shrink-0 rounded-chip bg-[var(--sunken)] px-2 py-0.5 text-[12px] text-muted">
                {KIND_LABELS[item.kind]}
              </span>
              <span className="w-[120px] shrink-0 text-right text-[12px] text-faint">
                {relativeTime(item.updatedAt)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
