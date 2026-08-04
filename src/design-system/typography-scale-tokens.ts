// Box UI | Tokens — коллекция Typography (режимы шрифта: Inter/Inter Display/Inter
// Tight/Inter Variable) + коллекция Grid (режимы Desktop/Mobile), сгенерировано из
// Figma-переменных. Числовая шкала (font-size/line-height/letter-spacing) одна и та же
// во всех 4 режимах шрифта — режим влияет только на font-family. Брейкпоинт (Desktop/
// Mobile) в Grid переопределяет размеры для display/heading, body и caption не меняются.

export const FONT_FAMILY_MODES = ['Inter', 'Inter Display', 'Inter Tight', 'Inter Variable'] as const
export type FontFamilyMode = (typeof FONT_FAMILY_MODES)[number]

export interface TypeStep {
  name: string
  desktop: { fontSize: number; lineHeight: number; letterSpacing: number }
  mobile: { fontSize: number; lineHeight: number; letterSpacing: number }
}

export const TYPE_SCALE: TypeStep[] = [
  { name: 'display/l', desktop: { fontSize: 72, lineHeight: 80, letterSpacing: -1.5 }, mobile: { fontSize: 64, lineHeight: 72, letterSpacing: -1.5 } },
  { name: 'display/m', desktop: { fontSize: 64, lineHeight: 72, letterSpacing: -1 }, mobile: { fontSize: 56, lineHeight: 64, letterSpacing: -1 } },
  { name: 'display/s', desktop: { fontSize: 56, lineHeight: 64, letterSpacing: -0.75 }, mobile: { fontSize: 48, lineHeight: 56, letterSpacing: -0.75 } },
  { name: 'heading/H1', desktop: { fontSize: 48, lineHeight: 56, letterSpacing: -0.5 }, mobile: { fontSize: 40, lineHeight: 48, letterSpacing: -0.5 } },
  { name: 'heading/H2', desktop: { fontSize: 40, lineHeight: 48, letterSpacing: -0.25 }, mobile: { fontSize: 32, lineHeight: 40, letterSpacing: -0.25 } },
  { name: 'heading/H3', desktop: { fontSize: 32, lineHeight: 40, letterSpacing: 0 }, mobile: { fontSize: 28, lineHeight: 36, letterSpacing: 0 } },
  { name: 'heading/H4', desktop: { fontSize: 24, lineHeight: 32, letterSpacing: 0 }, mobile: { fontSize: 20, lineHeight: 28, letterSpacing: 0 } },
  { name: 'heading/H5', desktop: { fontSize: 20, lineHeight: 24, letterSpacing: 0 }, mobile: { fontSize: 16, lineHeight: 20, letterSpacing: 0 } },
  { name: 'body/l', desktop: { fontSize: 16, lineHeight: 20, letterSpacing: 0 }, mobile: { fontSize: 16, lineHeight: 20, letterSpacing: 0 } },
  { name: 'body/m', desktop: { fontSize: 14, lineHeight: 18, letterSpacing: 0 }, mobile: { fontSize: 14, lineHeight: 18, letterSpacing: 0 } },
  { name: 'caption/l', desktop: { fontSize: 12, lineHeight: 16, letterSpacing: 0 }, mobile: { fontSize: 12, lineHeight: 16, letterSpacing: 0 } },
  { name: 'caption/m', desktop: { fontSize: 10, lineHeight: 12, letterSpacing: 0 }, mobile: { fontSize: 10, lineHeight: 12, letterSpacing: 0 } },
]

export const TYPE_WEIGHTS = { medium: 500, semibold: 600 }
