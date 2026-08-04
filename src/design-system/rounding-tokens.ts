// Box UI | Tokens — коллекция Rounding (режимы плотности: Low/Medium/Hight — так они
// названы в самом Figma-файле), сгенерировано из Figma-переменных. Это отдельная от
// Box UI шкала скруглений (--radius-*) — приложение использует свою упрощённую шкалу
// из 4 значений (см. страницу «Обзор»), здесь показана полная шкала из Figma как есть.

export const ROUNDING_DENSITIES = ['Low', 'Medium', 'Hight'] as const
export type RoundingDensity = (typeof ROUNDING_DENSITIES)[number]

export interface RoundingModeToken {
  name: string
  byDensity: Record<RoundingDensity, number>
}

export const ROUNDING_MODE_TOKENS: RoundingModeToken[] = [
  { name: 'rounding/base/none', byDensity: { Low: 0, Medium: 0, Hight: 0 } },
  { name: 'rounding/base/min', byDensity: { Low: 2, Medium: 4, Hight: 6 } },
  { name: 'rounding/base/2xs', byDensity: { Low: 4, Medium: 6, Hight: 8 } },
  { name: 'rounding/base/xs', byDensity: { Low: 6, Medium: 8, Hight: 12 } },
  { name: 'rounding/base/s', byDensity: { Low: 8, Medium: 12, Hight: 16 } },
  { name: 'rounding/base/m', byDensity: { Low: 12, Medium: 16, Hight: 20 } },
  { name: 'rounding/base/l', byDensity: { Low: 16, Medium: 20, Hight: 24 } },
  { name: 'rounding/base/xl', byDensity: { Low: 20, Medium: 24, Hight: 32 } },
  { name: 'rounding/base/2xl', byDensity: { Low: 24, Medium: 32, Hight: 40 } },
  { name: 'rounding/base/max', byDensity: { Low: 32, Medium: 40, Hight: 48 } },
  { name: 'rounding/base/full', byDensity: { Low: 9999, Medium: 9999, Hight: 9999 } },
]
