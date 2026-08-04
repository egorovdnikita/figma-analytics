import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Checkbox({
  checked,
  onChange,
  label,
  color,
}: {
  checked: boolean
  onChange: () => void
  label: ReactNode
  color?: string
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="group flex w-full items-center gap-2.5 rounded-full px-2 py-1.5 text-left transition-colors hover:bg-[var(--sunken)]"
    >
      <span
        className={cn(
          'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-colors',
          checked ? 'border-transparent' : 'border-line',
        )}
        style={checked ? { background: color ?? 'var(--grass)' } : undefined}
      >
        {checked ? (
          <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
            <path
              d="M2.5 6.2 4.7 8.4 9.5 3.6"
              fill="none"
              stroke="#fff"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
      <span className={cn('truncate text-[13px]', checked ? 'text-ink' : 'text-muted')}>{label}</span>
    </button>
  )
}
