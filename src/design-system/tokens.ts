/**
 * Данные для страницы «Обзор». Значения цветов не дублируются: они читаются из
 * src/index.css, единственного источника правды для рантайма. Раньше здесь
 * лежала копия, и после смены дизайн-системы она осталась с фиолетовым брендом
 * и старыми серыми — страница показывала не то, чем красится приложение.
 * Руками ведутся только описания и путь в Figma, по которому токен сверять.
 */
import css from '../index.css?raw'

function readBlock(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start === -1) return {}
  const body = css.slice(start, css.indexOf('\n}', start))
  const vars: Record<string, string> = {}
  for (const match of body.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)) vars[match[1]] = match[2].trim()
  return vars
}

const light = readBlock(':root')
const dark = readBlock('.dark')

export interface ColorToken {
  name: string
  cssVar: string
  light: string
  dark: string
  description: string
}

const COLORS: { name: string; description: string }[] = [
  { name: 'canvas', description: 'Фон окна под карточками · surface/base/fill/page' },
  { name: 'surface', description: 'Карточки, модальные окна, поля ввода · surface/base/fill/raised' },
  { name: 'raised', description: 'Приподнятые поверхности · surface/base/fill/raised' },
  { name: 'sunken', description: 'Вложенный слой: дорожки, поля поиска · surface/base/fill/layer-subtle' },
  { name: 'line', description: 'Границы и разделители · surface/base/border/default' },
  { name: 'line-strong', description: 'Заметная граница · surface/base/border/strong' },
  { name: 'line-subtle', description: 'Едва заметная граница · surface/base/border/subtle' },
  { name: 'ink', description: 'Основной текст · surface/base/content/strong' },
  { name: 'muted', description: 'Вторичный текст, подписи · surface/base/content/muted' },
  { name: 'faint', description: 'Плейсхолдеры, приглушённые иконки · surface/base/content/subtle' },
  { name: 'grass', description: 'Акцент: primary-кнопки, активное · interaction/accent/solid/fill/default (Deep)' },
  { name: 'grass-hover', description: 'Акцент при наведении · interaction/accent/solid/fill/hover' },
  { name: 'grass-active', description: 'Акцент при нажатии · interaction/accent/solid/fill/active' },
  { name: 'grass-ink', description: 'Текст на мягком акценте · interaction/accent/soft/content/enabled' },
  { name: 'grass-soft', description: 'Мягкий акцент · interaction/accent/soft/fill/default' },
  { name: 'grass-soft-hover', description: 'Мягкий акцент при наведении · interaction/accent/soft/fill/hover' },
  { name: 'lilac', description: 'Вторичный акцент: фокус, ссылки · brand color/solid/450' },
  { name: 'lilac-soft', description: 'Фон вторичного акцента · brand color/alpha/8' },
  { name: 'soft', description: 'Нейтральная мягкая кнопка · interaction/neutral/grayscale/soft/fill/default' },
  { name: 'soft-hover', description: '…при наведении · interaction/neutral/grayscale/soft/fill/hover' },
  { name: 'soft-active', description: '…при нажатии · interaction/neutral/grayscale/soft/fill/active' },
  { name: 'ghost-hover', description: 'Наведение на строки и пункты · interaction/ghost/fill/hover' },
  { name: 'ghost-active', description: 'Нажатие на строки и пункты · interaction/ghost/fill/active' },
  { name: 'outline', description: 'Рамка outline-кнопки · interaction/neutral/grayscale/outline/border/default' },
  { name: 'outline-hover', description: '…при наведении · interaction/neutral/grayscale/outline/border/hover' },
  { name: 'selection', description: 'Выбранный пункт сегмента · interaction/selection/neutral/fill/default' },
  { name: 'danger', description: 'Деструктивные кнопки · interaction/status/solid/fill/default (Negative)' },
  { name: 'danger-hover', description: '…при наведении · interaction/status/solid/fill/hover' },
  { name: 'danger-active', description: '…при нажатии · interaction/status/solid/fill/active' },
  { name: 'danger-ink', description: 'Текст ошибки на поверхности · status/content/on-surface/default' },
  { name: 'danger-soft', description: 'Мягкий фон ошибки · status/fill/soft' },
  { name: 'overlay', description: 'Подложка под модальными окнами · surface/base/fill/overlay' },
]

export const colorTokens: ColorToken[] = COLORS.map(({ name, description }) => ({
  name,
  cssVar: `--${name}`,
  light: light[`--${name}`] ?? '',
  dark: dark[`--${name}`] ?? light[`--${name}`] ?? '',
  description,
}))

export interface RadiusToken {
  name: string
  value: string
  className: string
  description: string
}

// Brand ・ Rounding, мода Medium (см. tailwind.config.ts).
export const radiusTokens: RadiusToken[] = [
  { name: 'chip', value: '8px', className: 'rounded-chip', description: 'Чипы, теги · rounding/xs' },
  { name: 'control', value: '16px', className: 'rounded-control', description: 'Инпуты, кнопки, пункты навигации, трек Segmented · rounding/m' },
  { name: 'card', value: '24px', className: 'rounded-card', description: 'Карточки, модальные окна, панели · rounding/xl' },
  { name: 'full', value: '9999px', className: 'rounded-full', description: 'Аватары, точки, переключатель Switch · rounding/full' },
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

// Шаги из Primitives ・ Typography (font-size/*). Других кеглей в приложении нет.
export const typeScale: TypeScaleToken[] = [
  { size: 10, usage: 'Служебные подписи заглавными, оси графиков (caption/m)' },
  { size: 12, usage: 'Подписи, чипы, вторичный текст, компактные кнопки (caption/l)' },
  { size: 14, usage: 'Базовый текст: поля, списки, кнопки всех размеров (body/m)' },
  { size: 16, usage: 'Крупные поля ввода, заголовки пустых состояний (body/l)' },
  { size: 20, usage: 'Заголовки модальных окон (heading/H5)' },
  { size: 24, usage: 'Имя в профиле, бренд-логотип (heading/H4)' },
  { size: 28, usage: 'Заголовок раздела в шапке, заголовки онбординга' },
]

export const fontFamily =
  "'Inter Variable', 'Golos Text', -apple-system, 'Segoe UI', system-ui, sans-serif"
