/**
 * Единственный источник правды для токенов — CSS-переменные в src/index.css
 * (светлая тема в :root, тёмная — в .dark). Этот файл дублирует значения
 * в виде данных для документации в Storybook и не используется в рантайме приложения.
 */

export interface ColorToken {
  name: string
  cssVar: string
  light: string
  dark: string
  description: string
}

// Значения синхронизированы с Figma: Box UI | Tokens (Mode: Light/Dark) для
// canvas/surface/ink/muted/faint, Box UI | Primitives → violet для grass/lilac.
export const colorTokens: ColorToken[] = [
  { name: 'canvas', cssVar: '--canvas', light: '#f5f5f5', dark: '#0a0a0a', description: 'Фон окна приложения, под карточками (background/base/primary)' },
  { name: 'surface', cssVar: '--surface', light: '#ffffff', dark: '#171717', description: 'Фон карточек, модальных окон, полей ввода (background/base/secondary)' },
  { name: 'raised', cssVar: '--raised', light: '#ffffff', dark: '#1e1e20', description: 'Приподнятые поверхности поверх surface (не из Figma-токенов, местный)' },
  { name: 'sunken', cssVar: '--sunken', light: '#f6f6f3', dark: '#121213', description: 'Утопленные зоны: hover/pressed, вложенные блоки (не из Figma-токенов, местный)' },
  { name: 'line', cssVar: '--line', light: '#e7e7e2', dark: '#272729', description: 'Границы, разделители (не из Figma-токенов, местный)' },
  { name: 'ink', cssVar: '--ink', light: '#171717', dark: '#fafafa', description: 'Основной текст (content/base/primary)' },
  { name: 'muted', cssVar: '--muted', light: '#737373', dark: '#a3a3a3', description: 'Вторичный текст, лейблы (content/base/secondary)' },
  { name: 'faint', cssVar: '--faint', light: '#a3a3a3', dark: '#737373', description: 'Плейсхолдеры, приглушённые иконки (content/base/tertiary)' },
  { name: 'grass', cssVar: '--grass', light: '#8b5cf6', dark: '#8b5cf6', description: 'Основной акцент (цвет иконки приложения): primary-кнопки, активные состояния (colors/brand/primary, mode=Violet)' },
  { name: 'grass-ink', cssVar: '--grass-ink', light: '#4c1d95', dark: '#ede9fe', description: 'Текст поверх grass-soft (violet/900 · violet/100)' },
  { name: 'grass-soft', cssVar: '--grass-soft', light: '#ede9fe', dark: '#2e1065', description: 'Мягкий фон акцента: активный пункт меню, чипы (violet/100 · violet/950)' },
  { name: 'lilac', cssVar: '--lilac', light: '#a78bfa', dark: '#a78bfa', description: 'Вторичный акцент: фокус-кольцо, ссылки (colors/brand/secondary, violet/400)' },
  { name: 'lilac-soft', cssVar: '--lilac-soft', light: '#f5f3ff', dark: '#211e31', description: 'Мягкий фон вторичного акцента (violet/50)' },
  { name: 'danger', cssVar: '--danger', light: '#d0554f', dark: '#cc5c6f', description: 'Деструктивные действия, ошибки (не из Figma-токенов — сохранён свой приглушённый оттенок)' },
]

export interface RadiusToken {
  name: string
  value: string
  className: string
  description: string
}

export const radiusTokens: RadiusToken[] = [
  { name: 'chip', value: '10px', className: 'rounded-chip', description: 'Чипы, теги' },
  { name: 'control', value: '16px', className: 'rounded-control', description: 'Инпуты, кнопки, IconButton, пункты навигации, трек Segmented' },
  { name: 'card', value: '24px', className: 'rounded-card', description: 'Карточки, модальные окна, панели' },
  { name: 'full', value: '9999px', className: 'rounded-full', description: 'Аватары, точки-индикаторы, переключатель Switch' },
]

export interface ShadowToken {
  name: string
  value: string
  className: string
  description: string
}

export const shadowTokens: ShadowToken[] = [
  {
    name: 'pop',
    value: '0 18px 48px -16px rgb(0 0 0 / 0.28), 0 2px 8px -2px rgb(0 0 0 / 0.12)',
    className: 'shadow-pop',
    description: 'Всплывающие модальные окна и попапы',
  },
]

export interface TypeScaleToken {
  size: number
  usage: string
}

export const typeScale: TypeScaleToken[] = [
  { size: 10, usage: 'Служебные пометки' },
  { size: 11, usage: 'Подписи под аватаром, метаданные' },
  { size: 12, usage: 'Чипы, заголовки групп в сайдбаре' },
  { size: 13, usage: 'Второстепенный текст, пункты меню' },
  { size: 14, usage: 'Навигация, компактные списки' },
  { size: 15, usage: 'Кнопки крупного размера, текст в модальных окнах' },
  { size: 16, usage: 'Базовый текст полей и селектов' },
  { size: 17, usage: 'Название приложения, подзаголовки' },
  { size: 19, usage: 'Заголовки модальных окон' },
  { size: 22, usage: 'Заголовок экрана онбординга' },
  { size: 24, usage: 'Крупные акцентные числа' },
  { size: 26, usage: 'Заголовок диапазона дат в шапке' },
  { size: 28, usage: 'Самый крупный заголовок' },
]

export const fontFamily =
  "'Inter Variable', 'Golos Text', -apple-system, 'Segoe UI', system-ui, sans-serif"
