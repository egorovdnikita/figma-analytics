import type { FontVariant } from '@/types'

/**
 * Figma Analytics | Tokens — Typography (модальность font-family/heading, font-family/body).
 * "Inter Display" не распространяется как отдельное семейство на Google Fonts/Fontsource —
 * приближаем его вариативным Inter (та же семья, opsz-ось встроена в файл).
 */
export const FONT_STACKS: Record<FontVariant, string> = {
  inter: "'Inter', 'Golos Text', -apple-system, 'Segoe UI', system-ui, sans-serif",
  'inter-display': "'Inter Variable', 'Golos Text', -apple-system, 'Segoe UI', system-ui, sans-serif",
  'inter-tight': "'Inter Tight Variable', 'Golos Text', -apple-system, 'Segoe UI', system-ui, sans-serif",
  'inter-variable': "'Inter Variable', 'Golos Text', -apple-system, 'Segoe UI', system-ui, sans-serif",
}

export const FONT_OPTIONS: { value: FontVariant; label: string }[] = [
  { value: 'inter', label: 'Inter' },
  { value: 'inter-display', label: 'Inter Display' },
  { value: 'inter-tight', label: 'Inter Tight' },
  { value: 'inter-variable', label: 'Inter Variable' },
]
