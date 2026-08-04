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
        'relative h-6 w-14 shrink-0 rounded-full transition-colors',
        checked ? 'bg-[var(--grass)]' : 'bg-[color-mix(in_srgb,var(--faint)_55%,var(--canvas))]',
      )}
    >
      <span
        className={cn(
          'absolute left-1 top-1 h-4 w-7 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  )
}
