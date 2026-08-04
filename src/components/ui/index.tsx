import {
  forwardRef,
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

/* ---------- кнопки ---------- */

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'soft' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const buttonBase =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors disabled:pointer-events-none disabled:opacity-45'

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--grass)] text-[var(--grass-ink)] hover:brightness-[0.96]',
  soft: 'bg-[var(--sunken)] text-ink hover:bg-[var(--line)]',
  outline: 'border border-line bg-transparent text-ink hover:bg-[var(--sunken)]',
  ghost: 'text-muted hover:bg-[var(--sunken)] hover:text-ink',
  danger: 'bg-transparent text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]',
}

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'soft', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      {...props}
    />
  ),
)
Button.displayName = 'Button'

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }
>(({ className, label, active, ...props }, ref) => (
  <button
    ref={ref}
    aria-label={label}
    title={label}
    className={cn(
      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
      active ? 'bg-[var(--sunken)] text-ink' : 'text-muted hover:bg-[var(--sunken)] hover:text-ink',
      className,
    )}
    {...props}
  />
))
IconButton.displayName = 'IconButton'

/* ---------- поля ---------- */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-control border border-line bg-surface px-4 text-sm text-ink',
        'placeholder:text-faint focus:border-[var(--lilac)] focus:outline-none',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full resize-none rounded-control border border-line bg-surface px-4 py-3 text-sm text-ink',
        'placeholder:text-faint focus:border-[var(--lilac)] focus:outline-none',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-11 w-full appearance-none rounded-control border border-line bg-surface px-4 text-sm text-ink',
        'focus:border-[var(--lilac)] focus:outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-faint">{hint}</span> : null}
    </label>
  )
}

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
        checked ? 'bg-[var(--grass)]' : 'bg-[var(--line)]',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-full p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors',
            value === option.value
              ? 'bg-[var(--grass)] text-[var(--grass-ink)]'
              : 'text-muted hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Chip({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'grass' | 'lilac'
  className?: string
}) {
  const tones = {
    neutral: 'bg-[var(--sunken)] text-muted',
    grass: 'bg-[var(--grass-soft)] text-[color-mix(in_srgb,var(--grass)_75%,var(--ink))]',
    lilac: 'bg-[var(--lilac-soft)] text-[var(--lilac)]',
  }
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Avatar({
  src,
  name,
  size = 32,
  className,
}: {
  src?: string
  name?: string
  size?: number
  className?: string
}) {
  const initials = (name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--grass-soft)] text-[var(--grass-ink)]',
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="font-semibold">{initials}</span>
      )}
    </span>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--grass)]',
        className,
      )}
      aria-hidden
    />
  )
}

/* ---------- модальное окно ---------- */

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
        className="animate-fade absolute inset-0 bg-[rgb(10_10_11_/_0.44)]"
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
          <h2 className="text-[19px] font-bold leading-tight text-ink">{title}</h2>
          <IconButton label="Закрыть" onClick={onClose} className="-mr-2 -mt-1 h-9 w-9">
            <X size={18} />
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
