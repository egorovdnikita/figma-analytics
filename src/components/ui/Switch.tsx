import { cn } from '@/lib/cn'

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-[var(--grass)]' : 'bg-[var(--faint)]',
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-5 w-7 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-3' : 'translate-x-0',
        )}
      />
    </button>
  )
}
