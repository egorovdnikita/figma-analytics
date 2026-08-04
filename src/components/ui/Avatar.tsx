import { cn } from '@/lib/cn'

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
