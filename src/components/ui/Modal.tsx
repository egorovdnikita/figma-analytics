import { useEffect, type ReactNode } from 'react'
import { IconButton } from './Button'

/** Solar не даёт крестик без обёртки (circle/square) — рисуем сами. */
function CloseGlyph() {
  return (
    <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden>
      <path
        d="M4 4l10 10M14 4 4 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 560,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  width?: number
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="animate-fade absolute inset-0 bg-[var(--overlay)]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className="animate-pop relative flex max-h-[86vh] w-full flex-col overflow-hidden rounded-card bg-surface shadow-pop"
        style={{ maxWidth: width }}
      >
        <header className="flex items-start justify-between gap-4 px-6 pb-2 pt-5">
          <h2 className="text-[20px] font-semibold leading-tight text-ink">{title}</h2>
          <IconButton label="Закрыть" onClick={onClose} className="-mr-2 -mt-1 h-9 w-9">
            <CloseGlyph />
          </IconButton>
        </header>
        <div className="scroll-thin flex-1 overflow-y-auto px-6 pb-2">{children}</div>
        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  )
}
