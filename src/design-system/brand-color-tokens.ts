// Figma Analytics | Tokens — коллекция Color (10 hue-режимов), сгенерировано из Figma-переменных.
// Только пять токенов пространства "brand" реально зависят от режима — Figma Analytics использует
// режим Violet (совпадает с --grass в src/index.css). Остальные 38 токенов инвариантны
// по всем режимам, поэтому хранятся отдельно как статичная таблица.

export const BRAND_MODES = [
  'Blue', 'Sky', 'Teal', 'Emerald', 'Orange', 'Amber', 'Violet', 'Purple', 'Cyan', 'Yellow',
] as const
export type BrandMode = (typeof BRAND_MODES)[number]

export interface BrandColorToken {
  name: string
  byMode: Record<BrandMode, string>
}

export const BRAND_COLOR_TOKENS: BrandColorToken[] = [
  {
    name: 'colors/brand/primary',
    byMode: { Blue: '#3b82f6', Sky: '#0ea5e9', Teal: '#22c55e', Emerald: '#10b981', Orange: '#f97316', Amber: '#f59e0b', Violet: '#8b5cf6', Purple: '#ad28ff', Cyan: '#ec4899', Yellow: '#f43f5e' },
  },
  {
    name: 'colors/brand/secondary',
    byMode: { Blue: '#60a5fa', Sky: '#38bdf8', Teal: '#4ade80', Emerald: '#34d399', Orange: '#fb923c', Amber: '#fbbf24', Violet: '#a78bfa', Purple: '#b947ff', Cyan: '#f472b6', Yellow: '#fb7185' },
  },
  {
    name: 'colors/brand/alpha-8',
    byMode: { Blue: '#3b82f614', Sky: '#0ea5e914', Teal: '#22c55e14', Emerald: '#10b98114', Orange: '#f9731614', Amber: '#f59e0b14', Violet: '#8b5cf614', Purple: '#ad28ff14', Cyan: '#ec489914', Yellow: '#f43f5e14' },
  },
  {
    name: 'colors/brand/alpha-16',
    byMode: { Blue: '#3b82f629', Sky: '#0ea5e929', Teal: '#22c55e29', Emerald: '#10b98129', Orange: '#f9731629', Amber: '#f59e0b29', Violet: '#8b5cf629', Purple: '#ad28ff29', Cyan: '#ec489929', Yellow: '#f43f5e29' },
  },
  {
    name: 'colors/brand/alpha-48',
    byMode: { Blue: '#3b82f67a', Sky: '#0ea5e97a', Teal: '#22c55e7a', Emerald: '#10b9817a', Orange: '#f973167a', Amber: '#f59e0b7a', Violet: '#8b5cf67a', Purple: '#ad28ff7a', Cyan: '#ec48997a', Yellow: '#f43f5e7a' },
  },
]

export interface StaticColorToken { name: string; hex: string }

export const STATIC_COLOR_TOKENS: StaticColorToken[] = [
  { name: 'colors/neutral/50', hex: '#fafafa' },
  { name: 'colors/neutral/100', hex: '#f5f5f5' },
  { name: 'colors/neutral/200', hex: '#e5e5e5' },
  { name: 'colors/neutral/300', hex: '#d4d4d4' },
  { name: 'colors/neutral/400', hex: '#a3a3a3' },
  { name: 'colors/neutral/500', hex: '#737373' },
  { name: 'colors/neutral/600', hex: '#525252' },
  { name: 'colors/neutral/700', hex: '#404040' },
  { name: 'colors/neutral/800', hex: '#262626' },
  { name: 'colors/neutral/900', hex: '#171717' },
  { name: 'colors/neutral/950', hex: '#0a0a0a' },
  { name: 'colors/neutral/alpha-8', hex: '#73737314' },
  { name: 'colors/neutral/alpha-16', hex: '#73737329' },
  { name: 'colors/neutral/alpha-24', hex: '#7373733d' },
  { name: 'colors/neutral/alpha-32', hex: '#73737352' },
  { name: 'colors/neutral/alpha-48', hex: '#7373737a' },
  { name: 'colors/informative/base', hex: '#3b82f6' },
  { name: 'colors/informative/alpha-16', hex: '#3b82f629' },
  { name: 'colors/informative/alpha-48', hex: '#3b82f67a' },
  { name: 'colors/positive/base', hex: '#22c55e' },
  { name: 'colors/positive/alpha-16', hex: '#22c55e29' },
  { name: 'colors/positive/alpha-48', hex: '#22c55e7a' },
  { name: 'colors/warning/base', hex: '#f59e0b' },
  { name: 'colors/warning/alpha-16', hex: '#f59e0b29' },
  { name: 'colors/warning/alpha-48', hex: '#f59e0b7a' },
  { name: 'colors/negative/base', hex: '#ef4444' },
  { name: 'colors/negative/alpha-16', hex: '#ef444429' },
  { name: 'colors/negative/alpha-48', hex: '#ef44447a' },
  { name: 'colors/white/base', hex: '#ffffff' },
  { name: 'colors/white/alpha-16', hex: '#ffffff29' },
  { name: 'colors/white/alpha-24', hex: '#ffffff3d' },
  { name: 'colors/white/alpha-32', hex: '#ffffff52' },
  { name: 'colors/white/alpha-48', hex: '#ffffff7a' },
  { name: 'colors/white/alpha-88', hex: '#ffffffe0' },
  { name: 'colors/black/base', hex: '#000000' },
  { name: 'colors/black/alpha-16', hex: '#00000029' },
  { name: 'colors/black/alpha-48', hex: '#0000007a' },
  { name: 'colors/black/alpha-80', hex: '#000000cc' },
]
