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

/** Быстрый переход по разделам, файлам и людям без мыши. Открывается на ⌘K,
 * закрывается на Escape; поиск идёт по подстроке без учёта регистра. */
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
    const needle = query.trim().toLowerCase()
    const matched = needle
      ? commands.filter(
          (command) =>
            command.label.toLowerCase().includes(needle) || command.hint?.toLowerCase().includes(needle),
        )
      : commands
    return matched.slice(0, 60)
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

        <div ref={listRef} className="scroll-thin scroll-soft flex-1 overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="p-6 text-center text-[14px] text-muted">Ничего не найдено</p>
          ) : (
            results.map((command, index) => {
              const showGroup = command.group !== lastGroup
              lastGroup = command.group
              return (
                <div key={command.id}>
                  {showGroup ? (
                    <p className="px-2 pb-1 pt-3 text-[11.5px] font-semibold uppercase tracking-wide text-faint">
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

        <footer className="flex items-center gap-3 bg-[var(--sunken)] px-4 py-2 text-[11.5px] text-faint">
          <span>↑↓ — выбор</span>
          <span>↵ — открыть</span>
          <span className="ml-auto">{results.length} результатов</span>
        </footer>
      </div>
    </div>
  )
}
