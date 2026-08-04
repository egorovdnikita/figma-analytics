import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { AppIcon } from '@/components/AppIcon'
import { cn } from '@/lib/cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    const pickerIcon = type === 'date' ? 'CalendarDays' : type === 'time' ? 'Clock' : null

    const input = (
      <input
        ref={ref}
        type={type}
        className={cn(
          'h-11 w-full rounded-control border border-line bg-surface px-4 text-sm text-ink',
          'placeholder:text-faint focus:border-[var(--lilac)] focus:outline-none',
          pickerIcon && 'pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0',
          className,
        )}
        {...props}
      />
    )

    if (!pickerIcon) return input

    return (
      <div className="relative">
        {input}
        <AppIcon
          name={pickerIcon}
          size={16}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-faint"
        />
      </div>
    )
  },
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
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'h-11 w-full appearance-none rounded-control border border-line bg-surface pl-4 pr-10 text-sm text-ink',
          'focus:border-[var(--lilac)] focus:outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <AppIcon
        name="ChevronDown"
        size={16}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-faint"
      />
    </div>
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
