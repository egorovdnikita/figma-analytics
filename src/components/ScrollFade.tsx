import { cn } from '@/lib/cn'

/**
 * Оверлей поверх скроллящегося контента: контент уходит в блюр и прозрачность
 * у верхнего края вместо резкого обреза. Размещать как соседа скролл-контейнера
 * внутри relative-обёртки, а не внутри самого скролл-контейнера — иначе оверлей
 * будет скроллиться вместе с содержимым.
 */
export function ScrollFadeTop({
  className,
  from = 'var(--canvas)',
}: {
  className?: string
  from?: string
}) {
  return (
    <div
      aria-hidden
      style={{ background: `linear-gradient(to bottom, ${from}, transparent)` }}
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-10 h-8 backdrop-blur-md',
        '[mask-image:linear-gradient(to_bottom,black,transparent)]',
        className,
      )}
    />
  )
}
