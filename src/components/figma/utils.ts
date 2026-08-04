import { differenceInDays, differenceInHours, differenceInMinutes, formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

export function relativeTime(iso: string) {
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: ru })
}

/** Человекочитаемая длительность между двумя моментами — используется для SLA
 * по комментариям (created_at → resolved_at) и для "давности" файла. */
export function humanDuration(fromIso: string, toIso: string) {
  const from = new Date(fromIso)
  const to = new Date(toIso)
  const days = differenceInDays(to, from)
  if (days >= 1) return `${days} ${pluralDays(days)}`
  const hours = differenceInHours(to, from)
  if (hours >= 1) return `${hours} ч`
  const minutes = Math.max(0, differenceInMinutes(to, from))
  return `${minutes} мин`
}

function pluralDays(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'день'
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'дня'
  return 'дней'
}

export function daysSince(iso: string) {
  return differenceInDays(new Date(), new Date(iso))
}

export function formatDurationMs(ms: number) {
  const hours = ms / (1000 * 60 * 60)
  if (hours >= 24) {
    const days = Math.round(hours / 24)
    return `${days} ${pluralDays(days)}`
  }
  if (hours >= 1) return `${Math.round(hours)} ч`
  return `${Math.max(1, Math.round(ms / (1000 * 60)))} мин`
}

/** Комментарии Figma плоские, с parent_id, ссылающимся на корневой id —
 * группируем в треды, чтобы показывать обсуждение целиком, а не список. */
export function groupCommentThreads<
  T extends { id: string; parent_id: string; created_at: string },
>(comments: T[]) {
  const roots = comments.filter((c) => !c.parent_id)
  const repliesByParent = new Map<string, T[]>()
  for (const comment of comments) {
    if (!comment.parent_id) continue
    const list = repliesByParent.get(comment.parent_id) ?? []
    list.push(comment)
    repliesByParent.set(comment.parent_id, list)
  }
  return roots
    .map((root) => ({
      root,
      replies: (repliesByParent.get(root.id) ?? []).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
    }))
    .sort((a, b) => new Date(b.root.created_at).getTime() - new Date(a.root.created_at).getTime())
}
