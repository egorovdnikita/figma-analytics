import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import type { FigmaEvent, FigmaEventKind } from '@/types'
import { Avatar, Input } from '@/components/ui'
import { EVENT_COLOR_VAR, EVENT_KINDS, EVENT_LABELS } from './analytics'
import { emojiGlyph, relativeTime } from './utils'
import { cn } from '@/lib/cn'

const PAGE = 100

/** Сырая лента всех событий — «каждый чих» в пространстве, без агрегации. */
export function ActivityPanel({
  events,
  onOpenFile,
}: {
  events: FigmaEvent[]
  onOpenFile: (key: string, name: string) => void
}) {
  const [kinds, setKinds] = useState<Set<FigmaEventKind>>(new Set(EVENT_KINDS))
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return events.filter((event) => {
      if (!kinds.has(event.kind)) return false
      if (!needle) return true
      return (
        event.handle.toLowerCase().includes(needle) ||
        event.fileName.toLowerCase().includes(needle) ||
        event.projectName.toLowerCase().includes(needle) ||
        (event.message ?? '').toLowerCase().includes(needle)
      )
    })
  }, [events, kinds, query])

  const visible = filtered.slice(0, limit)

  const toggle = (kind: FigmaEventKind) => {
    setKinds((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next.size === 0 ? new Set(EVENT_KINDS) : next
    })
    setLimit(PAGE)
  }

  return (
    <div className="space-y-3">
      <div className="viz flex flex-wrap items-center gap-2 rounded-card bg-surface p-3">
        {EVENT_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => toggle(kind)}
            className={cn(
              'flex h-7 items-center gap-1.5 rounded-chip px-2.5 text-[12px] transition-colors',
              kinds.has(kind) ? 'bg-[var(--sunken)] text-ink' : 'text-faint hover:text-muted',
            )}
            aria-pressed={kinds.has(kind)}
          >
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: EVENT_COLOR_VAR[kind] }} />
            {EVENT_LABELS[kind]}
          </button>
        ))}
        <div className="ml-auto w-[240px]">
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setLimit(PAGE)
            }}
            placeholder="Поиск по автору, файлу, тексту…"
            className="h-8 text-[12px]"
          />
        </div>
      </div>

      <div className="rounded-card bg-surface p-2">
        <p className="px-2 py-1.5 text-[11px] text-muted">
          {filtered.length.toLocaleString('ru')} событий · показано {visible.length.toLocaleString('ru')}
        </p>

        <ol className="space-y-0.5">
          {visible.map((event, index) => (
            <li key={`${event.kind}-${event.ts}-${event.fileKey}-${index}`}>
              <button
                type="button"
                onClick={() => onOpenFile(event.fileKey, event.fileName)}
                className="flex w-full items-start gap-2.5 rounded-control p-2 text-left hover:bg-[var(--sunken)]"
              >
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ background: EVENT_COLOR_VAR[event.kind] }}
                  aria-hidden
                />
                {event.handle ? (
                  <Avatar src={event.img} name={event.handle} size={22} />
                ) : (
                  <span className="h-[22px] w-[22px] shrink-0 rounded-full bg-[var(--sunken)]" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] text-ink">
                    <span className="font-medium">{event.handle || 'Система'}</span>{' '}
                    <span className="text-muted">{describe(event)}</span>
                  </p>
                  {event.message ? (
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted">{event.message}</p>
                  ) : null}
                  <p className="mt-0.5 text-[11px] text-faint">
                    {event.fileName}
                    {event.projectName ? ` · ${event.projectName}` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] text-muted">{format(new Date(event.ts), 'd MMM, HH:mm', { locale: ru })}</p>
                  <p className="text-[11px] text-faint">{relativeTime(event.ts)}</p>
                </div>
              </button>
            </li>
          ))}
        </ol>

        {visible.length < filtered.length ? (
          <div className="flex justify-center py-2">
            <button
              type="button"
              onClick={() => setLimit((v) => v + PAGE)}
              className="h-8 rounded-control px-3 text-[12px] text-muted hover:bg-[var(--sunken)] hover:text-ink"
            >
              Показать ещё {Math.min(PAGE, filtered.length - visible.length)}
            </button>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <p className="p-6 text-center text-[13px] text-muted">Ничего не найдено</p>
        ) : null}
      </div>
    </div>
  )
}

function describe(event: FigmaEvent) {
  switch (event.kind) {
    case 'version':
      return event.label ? `сохранил версию «${event.label}»` : 'сохранил версию'
    case 'comment':
      return 'оставил комментарий'
    case 'reply':
      return 'ответил в обсуждении'
    case 'resolve':
      return 'обсуждение закрыто'
    case 'reaction':
      return `поставил реакцию ${emojiGlyph(event.emoji ?? '')}`
  }
}
