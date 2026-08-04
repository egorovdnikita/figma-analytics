import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'soft' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const buttonBase =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition-colors disabled:pointer-events-none disabled:opacity-45'

export const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--grass)] text-[var(--grass-ink)] hover:brightness-[0.96]',
  soft: 'bg-[var(--sunken)] text-ink hover:bg-[var(--line)]',
  outline: 'border border-line bg-transparent text-ink hover:bg-[var(--sunken)]',
  ghost: 'text-muted hover:bg-[var(--sunken)] hover:text-ink',
  danger: 'bg-transparent text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]',
}

export const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
}

export const BUTTON_VARIANTS = Object.keys(buttonVariants) as ButtonVariant[]
export const BUTTON_SIZES = Object.keys(buttonSizes) as ButtonSize[]

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
      'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control transition-colors',
      active ? 'bg-[var(--sunken)] text-ink' : 'text-muted hover:bg-[var(--sunken)] hover:text-ink',
      className,
    )}
    {...props}
  />
))
IconButton.displayName = 'IconButton'
