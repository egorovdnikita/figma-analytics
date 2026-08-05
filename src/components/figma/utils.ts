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

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

/** Бакеты по дню недели (0 = понедельник) — для теплокарты активности. */
export function weekdayBuckets(dates: string[]) {
  const counts = new Array(7).fill(0)
  for (const iso of dates) {
    const jsDay = new Date(iso).getDay() // 0 = воскресенье
    const index = (jsDay + 6) % 7 // сдвигаем так, чтобы 0 = понедельник
    counts[index] += 1
  }
  return WEEKDAY_LABELS.map((label, index) => ({ label, count: counts[index] }))
}

const MENTION_RE = /@([a-zA-Z0-9_.\-]+)/g

/** Парсит @упоминания из текста комментариев — сырой текст, без сверки со
 * списком реальных пользователей (Figma API не отдаёт для этого готового справочника). */
export function extractMentions(text: string): string[] {
  return [...text.matchAll(MENTION_RE)].map((match) => match[1])
}

const EMOJI_GLYPHS: Record<string, string> = {
  ':white_check_mark:': '✅',
  ':heavy_check_mark:': '✔️',
  ':+1:': '👍',
  ':thumbsup:': '👍',
  ':-1:': '👎',
  ':thumbsdown:': '👎',
  ':heart:': '❤️',
  ':eyes:': '👀',
  ':tada:': '🎉',
  ':fire:': '🔥',
  ':100:': '💯',
  ':thinking:': '🤔',
  ':question:': '❓',
  ':exclamation:': '❗',
  ':warning:': '⚠️',
  ':rocket:': '🚀',
  ':clap:': '👏',
  ':smile:': '😄',
  ':laughing:': '😆',
  ':joy:': '😂',
}

/** Реакции в Figma приходят как shortcode (":white_check_mark:") — переводим
 * в глиф там, где знаем соответствие, иначе показываем сам shortcode. */
export function emojiGlyph(shortcode: string) {
  return EMOJI_GLYPHS[shortcode] ?? shortcode
}

export function groupReactions(reactions: { emoji: string }[] | undefined) {
  if (!reactions || reactions.length === 0) return []
  const counts = new Map<string, number>()
  for (const reaction of reactions) counts.set(reaction.emoji, (counts.get(reaction.emoji) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
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
