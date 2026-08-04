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

export const colorTokens: ColorToken[] = [
  { name: 'canvas', cssVar: '--canvas', light: '#f0f0ee', dark: '#0b0b0c', description: 'Фон окна приложения, под карточками' },
  { name: 'surface', cssVar: '--surface', light: '#ffffff', dark: '#171718', description: 'Фон карточек, модальных окон, полей ввода' },
  { name: 'raised', cssVar: '--raised', light: '#ffffff', dark: '#1e1e20', description: 'Приподнятые поверхности поверх surface' },
  { name: 'sunken', cssVar: '--sunken', light: '#f6f6f3', dark: '#121213', description: 'Утопленные зоны: hover/pressed, вложенные блоки' },
  { name: 'line', cssVar: '--line', light: '#e7e7e2', dark: '#272729', description: 'Границы, разделители' },
  { name: 'ink', cssVar: '--ink', light: '#16171a', dark: '#f1f1ef', description: 'Основной текст' },
  { name: 'muted', cssVar: '--muted', light: '#8a8a85', dark: '#8d8d88', description: 'Вторичный текст, лейблы' },
  { name: 'faint', cssVar: '--faint', light: '#b6b6af', dark: '#5e5e5a', description: 'Плейсхолдеры, приглушённые иконки' },
  { name: 'grass', cssVar: '--grass', light: '#7cc49b', dark: '#6db78d', description: 'Основной акцент: primary-кнопки, активные состояния' },
  { name: 'grass-ink', cssVar: '--grass-ink', light: '#123425', dark: '#0b1a12', description: 'Текст поверх grass' },
  { name: 'grass-soft', cssVar: '--grass-soft', light: '#e4f2e7', dark: '#1b2a21', description: 'Мягкий фон акцента: активный пункт меню, чипы' },
  { name: 'lilac', cssVar: '--lilac', light: '#8a72dd', dark: '#a78bfa', description: 'Вторичный акцент: фокус-кольцо, ссылки' },
  { name: 'lilac-soft', cssVar: '--lilac-soft', light: '#eeeafc', dark: '#211e31', description: 'Мягкий фон вторичного акцента' },
  { name: 'danger', cssVar: '--danger', light: '#d0554f', dark: '#e0736d', description: 'Деструктивные действия, ошибки' },
]

export interface RadiusToken {
  name: string
  value: string
  className: string
  description: string
}

export const radiusTokens: RadiusToken[] = [
  { name: 'control', value: '14px', className: 'rounded-control', description: 'Инпуты, textarea, select' },
  { name: 'card', value: '20px', className: 'rounded-card', description: 'Карточки, модальные окна, панели' },
  { name: 'full', value: '9999px', className: 'rounded-full', description: 'Кнопки, чипы, аватары, переключатели' },
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
  "Onest, Inter, 'Golos Text', -apple-system, 'Segoe UI', system-ui, sans-serif"
