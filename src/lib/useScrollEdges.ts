import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Мягкий край прокручиваемой области — только там, где он что-то значит.
 *
 * Чисто на CSS это не решается: `mask-image` не знает, есть ли переполнение,
 * поэтому статичная маска подъедала верх списка даже когда прокручивать нечего.
 * Хук следит за позицией и возвращает класс, включающий затухание сверху
 * только после начала прокрутки, а снизу — пока внизу ещё остался контент.
 */
export function useScrollEdges<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [edges, setEdges] = useState({ top: false, bottom: false })

  const measure = useCallback(() => {
    const node = ref.current
    if (!node) return
    const { scrollTop, scrollHeight, clientHeight } = node
    // Порог в 1px гасит дребезг на дробных величинах при масштабировании.
    const top = scrollTop > 1
    const bottom = scrollTop + clientHeight < scrollHeight - 1
    setEdges((prev) => (prev.top === top && prev.bottom === bottom ? prev : { top, bottom }))
  }, [])

  useEffect(() => {
    const node = ref.current
    if (!node) return

    measure()
    node.addEventListener('scroll', measure, { passive: true })

    // Контент внутри меняется динамически (фильтры, загрузка), поэтому следим
    // и за размерами: иначе после подгрузки данных маска останется неверной.
    const resize = new ResizeObserver(measure)
    resize.observe(node)
    for (const child of Array.from(node.children)) resize.observe(child)

    const mutation = new MutationObserver(measure)
    mutation.observe(node, { childList: true, subtree: true })

    return () => {
      node.removeEventListener('scroll', measure)
      resize.disconnect()
      mutation.disconnect()
    }
  }, [measure])

  const className = edges.top && edges.bottom ? 'scroll-soft' : edges.top ? 'scroll-soft-top' : edges.bottom ? 'scroll-soft-bottom' : ''

  return { ref, className, edges }
}
