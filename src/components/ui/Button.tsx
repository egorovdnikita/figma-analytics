import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'soft' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const buttonBase =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium transition-colors disabled:pointer-events-none disabled:opacity-45'

/* Заливки на hover/active — из Controls ・ Appearance × State дизайн-системы,
 * а не затемнение фильтром: у акцента в DS наведение светлее покоя, нажатие —
 * темнее, и brightness этого не повторит. */
export const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--grass)] text-white hover:bg-[var(--grass-hover)] active:bg-[var(--grass-active)]',
  soft: 'bg-[var(--soft)] text-ink hover:bg-[var(--soft-hover)] active:bg-[var(--soft-active)]',
  outline:
    'border border-[var(--outline)] bg-transparent text-ink hover:border-[var(--outline-hover)] active:bg-[var(--ghost-hover)]',
  ghost: 'text-muted hover:bg-[var(--ghost-hover)] hover:text-ink active:bg-[var(--ghost-active)]',
  danger:
    'bg-[var(--danger)] text-white hover:bg-[var(--danger-hover)] active:bg-[var(--danger-active)]',
}

export const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[12px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[14px]',
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
      active ? 'bg-[var(--sunken)] text-ink' : 'text-muted hover:bg-[var(--ghost-hover)] hover:text-ink',
      className,
    )}
    {...props}
  />
))
IconButton.displayName = 'IconButton'
