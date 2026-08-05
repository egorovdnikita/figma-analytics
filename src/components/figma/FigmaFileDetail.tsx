import { useEffect, useState } from 'react'
import { ipc } from '@/lib/ipc'
import type { FigmaComment, FigmaFileMeta, FigmaVersion } from '@/types'
import { Avatar, Segmented, Spinner, Button, Chip } from '@/components/ui'
import { AppIcon } from '@/components/AppIcon'
import { relativeTime, humanDuration, groupCommentThreads, groupReactions, emojiGlyph } from './utils'

type Tab = 'overview' | 'versions' | 'comments'
const PAGE_SIZE = 30

export function FigmaFileDetail({
  fileKey,
  fallbackName,
  onDataChanged,
}: {
  fileKey: string
  fallbackName: string
  onDataChanged: () => void
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const [meta, setMeta] = useState<FigmaFileMeta | null>(null)

  useEffect(() => {
    let alive = true
    ipc.figmaFile(fileKey).then((result) => {
      if (alive) setMeta(result)
      onDataChanged()
    })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey])

  return (
    <div className="space-y-4">
      <header className="flex items-start gap-4 rounded-card bg-surface p-4">
        {meta?.thumbnailUrl ? (
          <img
            src={meta.thumbnailUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-control object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-control bg-[var(--sunken)] text-faint">
            <AppIcon name="AlignLeft" size={22} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[16px] font-medium text-ink">{meta?.name ?? fallbackName}</h2>
          <p className="mt-0.5 text-[13px] text-muted">
            {meta ? (
              <>
                Обновлён {relativeTime(meta.lastModified)} · роль: {meta.role}
              </>
            ) : (
              'Загрузка…'
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void ipc.openExternal(`https://www.figma.com/file/${fileKey}`)}
        >
          <AppIcon name="ExternalLink" size={14} />
          Открыть в Figma
        </Button>
      </header>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'overview', label: 'Обзор' },
          { value: 'versions', label: 'История версий' },
          { value: 'comments', label: 'Комментарии' },
        ]}
        className="bg-surface"
      />

      {tab === 'overview' ? (
        <FileOverviewTab fileKey={fileKey} />
      ) : tab === 'versions' ? (
        <VersionsTab fileKey={fileKey} />
      ) : (
        <CommentsTab fileKey={fileKey} />
      )}
    </div>
  )
}

function FileOverviewTab({ fileKey }: { fileKey: string }) {
  const [versions, setVersions] = useState<FigmaVersion[] | null>(null)
  const [commentStats, setCommentStats] = useState<{ open: number; resolved: number } | null>(null)

  useEffect(() => {
    ipc.figmaVersions(fileKey, 0, 10).then((page) => setVersions(page.items))
    // limit: 0 — тела комментариев не нужны, только агрегированные счётчики
    ipc.figmaComments(fileKey, 0, 0).then((page) => setCommentStats({ open: page.open, resolved: page.resolved }))
  }, [fileKey])

  return (
    <div className="grid grid-cols-2 gap-3">
      <section className="rounded-card bg-surface p-4">
        <h3 className="mb-3 text-[14px] font-medium text-ink">Последние сохранения</h3>
        {versions === null ? (
          <Spinner className="h-4 w-4" />
        ) : (
          <div className="space-y-2">
            {versions.slice(0, 6).map((version) => (
              <div key={version.id} className="flex items-center gap-2.5">
                <Avatar src={version.user.img_url} name={version.user.handle} size={22} />
                <span className="flex-1 truncate text-[14px] text-ink">{version.user.handle}</span>
                <span className="text-[12px] text-faint">{relativeTime(version.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-card bg-surface p-4">
        <h3 className="mb-3 text-[14px] font-medium text-ink">Комментарии</h3>
        {commentStats === null ? (
          <Spinner className="h-4 w-4" />
        ) : (
          <div className="flex items-center gap-3">
            <Chip tone={commentStats.open > 0 ? 'lilac' : 'neutral'}>{commentStats.open} открыто</Chip>
            <Chip tone="grass">{commentStats.resolved} решено</Chip>
          </div>
        )}
      </section>
    </div>
  )
}

function VersionsTab({ fileKey }: { fileKey: string }) {
  const [items, setItems] = useState<FigmaVersion[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)

  const loadMore = () => {
    setLoading(true)
    ipc.figmaVersions(fileKey, items.length, PAGE_SIZE).then((page) => {
      setItems((prev) => [...prev, ...page.items])
      setHasMore(page.hasMore)
      setLoading(false)
    })
  }

  useEffect(() => {
    setItems([])
    setHasMore(true)
    setLoading(true)
    ipc.figmaVersions(fileKey, 0, PAGE_SIZE).then((page) => {
      setItems(page.items)
      setHasMore(page.hasMore)
      setLoading(false)
    })
  }, [fileKey])

  return (
    <section className="rounded-card bg-surface p-2">
      {items.map((version, index) => {
        const prev = items[index - 1]
        const daysBetween = prev ? humanDuration(version.created_at, prev.created_at) : null
        return (
          <div key={version.id} className="flex items-center gap-3 rounded-control px-2 py-2 hover:bg-[var(--sunken)]">
            <Avatar src={version.user.img_url} name={version.user.handle} size={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] text-ink">
                <span className="font-medium">{version.user.handle}</span>
                {version.label ? <span className="text-muted"> · {version.label}</span> : null}
              </p>
              <p className="text-[12px] text-faint">{relativeTime(version.created_at)}</p>
            </div>
            {daysBetween ? <span className="shrink-0 text-[12px] text-faint">+{daysBetween}</span> : null}
          </div>
        )
      })}

      {loading ? (
        <div className="flex justify-center py-3">
          <Spinner className="h-4 w-4" />
        </div>
      ) : hasMore ? (
        <div className="flex justify-center py-2">
          <Button variant="ghost" size="sm" onClick={loadMore}>
            Показать ещё
          </Button>
        </div>
      ) : items.length === 0 ? (
        <p className="p-3 text-[13px] text-faint">Истории версий пока нет</p>
      ) : null}
    </section>
  )
}

function CommentsTab({ fileKey }: { fileKey: string }) {
  const [comments, setComments] = useState<FigmaComment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'open'>('all')

  useEffect(() => {
    setLoading(true)
    ipc.figmaComments(fileKey, 0, 5000).then((page) => {
      setComments(page.items)
      setLoading(false)
    })
  }, [fileKey])

  if (loading) {
    return (
      <div className="flex justify-center rounded-card bg-surface py-6">
        <Spinner className="h-4 w-4" />
      </div>
    )
  }

  const threads = groupCommentThreads(comments).filter((t) => filter === 'all' || !t.root.resolved_at)

  return (
    <section className="space-y-2">
      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: 'Все' },
          { value: 'open', label: 'Открытые' },
        ]}
        className="bg-surface"
      />

      {threads.length === 0 ? (
        <p className="rounded-card bg-surface p-4 text-[13px] text-faint">
          {filter === 'open' ? 'Открытых обсуждений нет' : 'Комментариев пока нет'}
        </p>
      ) : (
        <div className="space-y-2">
          {threads.map(({ root, replies }) => (
            <div key={root.id} className="rounded-card bg-surface p-3">
              <CommentRow comment={root} />
              {root.resolved_at ? (
                <p className="ml-9 mt-1 text-[12px] text-[var(--grass)]">
                  Решено за {humanDuration(root.created_at, root.resolved_at)}
                </p>
              ) : null}
              {replies.length > 0 ? (
                <div className="ml-9 mt-2 space-y-2 rounded-control bg-[var(--sunken)] p-2">
                  {replies.map((reply) => (
                    <CommentRow key={reply.id} comment={reply} compact />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function CommentRow({ comment, compact }: { comment: FigmaComment; compact?: boolean }) {
  const reactionGroups = groupReactions(comment.reactions)
  return (
    <div className="flex gap-2.5">
      <Avatar src={comment.user.img_url} name={comment.user.handle} size={compact ? 22 : 26} />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] text-ink">
          <span className="font-medium">{comment.user.handle}</span>{' '}
          <span className="text-[12px] text-faint">{relativeTime(comment.created_at)}</span>
        </p>
        <p className="mt-0.5 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{comment.message}</p>
        {reactionGroups.length > 0 ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {reactionGroups.map(([emoji, count]) => (
              <span
                key={emoji}
                className="inline-flex h-5 items-center gap-1 rounded-chip bg-[var(--sunken)] px-1.5 text-[12px] text-muted"
              >
                {emojiGlyph(emoji)} {count}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
