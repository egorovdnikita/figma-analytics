import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type ChipTone = 'neutral' | 'grass' | 'lilac'

export function Chip({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: ChipTone
  className?: string
}) {
  const tones: Record<ChipTone, string> = {
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
