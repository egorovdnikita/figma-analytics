import { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar } from '@/components/ui'
import { AppIcon, type IconName } from '@/components/AppIcon'
import { cn } from '@/lib/cn'

export interface Command {
  id: string
  group: string
  label: string
  hint?: string
  icon?: IconName
  avatar?: string
  run: () => void
}

/**
 * Оценка совпадения запроса со строкой. Чем больше, тем лучше; null — не
 * подходит вовсе.
 *
 * Простого вхождения подстроки мало: в палитре набирают огрызками («дшбрд»,
 * «dsgn sys»), и при точном вхождении такой запрос не находит ничего. Поэтому
 * сначала пробуем подстроку — это самый сильный сигнал, — а затем ищем буквы
 * запроса по порядку, награждая совпадения подряд и начала слов.
 */
export function matchScore(text: string, query: string): number | null {
  const haystack = text.toLowerCase()
  const needle = query.toLowerCase()
  if (!needle) return 0

  const direct = haystack.indexOf(needle)
  if (direct === 0) return 1000
  if (direct > 0) return 800 - Math.min(direct, 100) + (isWordStart(haystack, direct) ? 60 : 0)

  let score = 0
  let cursor = 0
  let streak = 0
  for (const char of needle) {
    const found = haystack.indexOf(char, cursor)
    if (found === -1) return null
    streak = found === cursor && cursor > 0 ? streak + 1 : 0
    score += 10 + streak * 6 + (isWordStart(haystack, found) ? 12 : 0)
    cursor = found + 1
  }
  // Короткое совпадение весомее длинного: в «Дашборд» три буквы значат больше,
  // чем те же три в названии файла на сорок символов.
  return score - Math.round(haystack.length / 8)
}

function isWordStart(text: string, index: number) {
  if (index === 0) return true
  return /[\s/\-_.·:,()]/.test(text[index - 1])
}

/** Быстрый переход по разделам, файлам и людям без мыши. Открывается на ⌘K,
 * закрывается на Escape; поиск нечёткий, результаты отсортированы по близости. */
export function CommandPalette({
  open,
  onClose,
  commands,
}: {
  open: boolean
  onClose: () => void
  commands: Command[]
}) {
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  const results = useMemo(() => {
    const needle = query.trim()
    if (!needle) return commands.slice(0, 60)

    const scored: { command: Command; score: number }[] = []
    for (const command of commands) {
      const label = matchScore(command.label, needle)
      // Подсказка — слабый сигнал: по ней находят проект или команду, но
      // название всё равно важнее.
      const hint = command.hint ? matchScore(command.hint, needle) : null
      const best = Math.max(label ?? -Infinity, hint === null ? -Infinity : hint * 0.4)
      if (best > -Infinity) scored.push({ command, score: best })
    }

    scored.sort((a, b) => b.score - a.score)
    const top = scored.slice(0, 60).map((item) => item.command)

    // Группы — в порядке их лучшего совпадения, внутри — по близости. Без этого
    // ранжированный список шёл бы вперемешку, и заголовок «Файлы» повторялся
    // бы между разделами и людьми.
    const order: string[] = []
    const byGroup = new Map<string, Command[]>()
    for (const command of top) {
      if (!byGroup.has(command.group)) {
        byGroup.set(command.group, [])
        order.push(command.group)
      }
      byGroup.get(command.group)!.push(command)
    }
    return order.flatMap((group) => byGroup.get(group)!)
  }, [commands, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setCursor(0)
    const timer = setTimeout(() => inputRef.current?.focus(), 10)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    setCursor(0)
  }, [query])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setCursor((value) => Math.min(results.length - 1, value + 1))
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setCursor((value) => Math.max(0, value - 1))
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        const command = results[cursor]
        if (command) {
          command.run()
          onClose()
        }
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, results, cursor, onClose])

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  if (!open) return null

  let lastGroup = ''

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-6 pt-[12vh]">
      <div className="animate-fade absolute inset-0 bg-[var(--overlay)]" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Быстрый переход"
        className="animate-pop relative flex max-h-[62vh] w-full max-w-[620px] flex-col overflow-hidden rounded-card bg-surface shadow-pop"
      >
        <div className="flex items-center gap-2.5 px-4">
          <AppIcon name="Search" size={16} className="shrink-0 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Раздел, файл, участник…"
            className="h-12 w-full bg-transparent text-[14px] text-ink placeholder:text-faint focus:outline-none"
          />
          <kbd className="shrink-0 rounded-chip bg-[var(--sunken)] px-1.5 py-0.5 text-[10px] text-muted">esc</kbd>
        </div>

        <div ref={listRef} className="scroll-thin flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="p-6 text-center text-[14px] text-muted">Ничего не найдено</p>
          ) : (
            results.map((command, index) => {
              const showGroup = command.group !== lastGroup
              lastGroup = command.group
              return (
                <div key={command.id}>
                  {showGroup ? (
                    <p className="px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-faint">
                      {command.group}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    data-active={index === cursor}
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => {
                      command.run()
                      onClose()
                    }}
                    className={cn(
                      'flex h-10 w-full items-center gap-2.5 rounded-control px-2 text-left transition-colors',
                      index === cursor ? 'bg-[var(--sunken)]' : '',
                    )}
                  >
                    {command.avatar !== undefined ? (
                      <Avatar src={command.avatar} name={command.label} size={20} />
                    ) : command.icon ? (
                      <AppIcon name={command.icon} size={16} className="shrink-0 text-muted" />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{command.label}</span>
                    {command.hint ? (
                      <span className="shrink-0 truncate text-[12px] text-faint">{command.hint}</span>
                    ) : null}
                  </button>
                </div>
              )
            })
          )}
        </div>

        <footer className="flex items-center gap-3 bg-[var(--sunken)] px-4 py-2 text-[12px] text-faint">
          <span>↑↓ — выбор</span>
          <span>↵ — открыть</span>
          <span className="ml-auto [font-variant-numeric:tabular-nums]">
            {results.length} {pluralResults(results.length)}
          </span>
        </footer>
      </div>
    </div>
  )
}

function pluralResults(count: number) {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return 'результат'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'результата'
  return 'результатов'
}
