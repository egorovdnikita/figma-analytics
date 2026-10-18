/**
 * Синхронизация страниц токенов в Storybook с дизайн-системой box-ui.
 *
 * Источник правды — дампы переменных Figma в репозитории box-ui
 * (tokens/figma/*.txt). Скрипт читает их, разрешает алиасы и пишет данные
 * для страниц в src/design-system/. Руками эти файлы не правятся: раньше их
 * сгенерировали из старых файлов Figma, и после перестройки дизайн-системы они
 * тихо разошлись с ней — фиолетовый бренд, «Hight», коллекция Opacity, которой
 * больше нет.
 *
 *   node scripts/sync-design-tokens.mjs                 # из main на GitHub
 *   node scripts/sync-design-tokens.mjs --ref 5309aef   # из конкретного коммита
 *   node scripts/sync-design-tokens.mjs --from ../box-ui/tokens/figma
 *
 * Рантайм-значения в src/index.css скрипт не трогает: там токены сведены к
 * переменным приложения, и это осознанная правка, а не выгрузка.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'src', 'design-system')
const REPO = 'egorovdnikita/box-ui'
const FILES = [
  'prim-color', 'prim-type', 'prim-rounding', 'prim-spacing', 'prim-size',
  'sys-color', 'sys-theme', 'sys-responsive', 'sys-status',
  'brand-color', 'brand-rounding', 'brand-type', 'brand-icon',
]

const args = process.argv.slice(2)
const flag = (name) => {
  const index = args.indexOf(name)
  return index === -1 ? null : args[index + 1]
}

/* ---------- чтение дампов ---------- */

async function readDumps() {
  const from = flag('--from')
  const ref = flag('--ref') ?? 'main'
  const texts = {}
  for (const name of FILES) {
    if (from) {
      texts[name] = fs.readFileSync(path.resolve(from, `${name}.txt`), 'utf8')
    } else {
      const url = `https://raw.githubusercontent.com/${REPO}/${ref}/tokens/figma/${name}.txt`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`${url}: ${res.status}`)
      texts[name] = await res.text()
    }
  }
  return { texts, source: from ? path.resolve(from) : `${REPO}@${ref}` }
}

/** Грамматика — tokens/figma/README.md в box-ui. */
function parse(text) {
  let modes = ['Value']
  let figma = ''
  const rows = new Map()
  for (const line of text.split('\n')) {
    if (line.startsWith('# modes:')) modes = line.slice(8).split(',').map((m) => m.trim())
    if (line.startsWith('# figma:')) figma = line.slice(8).trim()
    if (!line.trim() || line.startsWith('#')) continue
    if (line.includes(' :: ')) {
      const [name, rest] = line.split(' :: ')
      const values = {}
      for (const part of rest.split(' | ')) {
        const at = part.indexOf('=')
        values[part.slice(0, at).trim()] = part.slice(at + 1).trim()
      }
      rows.set(name.trim(), values)
    } else {
      const at = line.indexOf('=')
      rows.set(line.slice(0, at).trim(), { Value: line.slice(at + 1).trim() })
    }
  }
  return { modes, figma, rows }
}

function makeResolver(collections) {
  const pick = (values, mode) => values[mode] ?? values.Value ?? Object.values(values)[0]

  /** Возвращает конечное значение и путь примитива, на котором кончилась цепочка. */
  function resolve(raw, mode, depth = 0) {
    if (depth > 24) throw new Error(`цикл алиасов: ${raw}`)
    const alpha = raw.match(/^alpha\((\d+(?:\.\d+)?),\s*(.+)\)$/)
    if (alpha) {
      const base = resolve(alpha[2], mode, depth + 1)
      return { value: withAlpha(base.value, Number(alpha[1]) / 100), primitive: base.primitive }
    }
    if (raw.startsWith('@')) {
      const [collection, name] = raw.slice(1).split(/:(.+)/)
      const row = collections[collection]?.rows.get(name)
      if (!row) throw new Error(`алиас в пустоту: ${raw}`)
      const next = resolve(pick(row, mode), mode, depth + 1)
      return { value: next.value, primitive: next.primitive ?? `${collection}:${name}` }
    }
    return { value: raw.replace(/^"|"$/g, ''), primitive: null }
  }

  return (collection, name, mode) => {
    const row = collections[collection].rows.get(name)
    return resolve(pick(row, mode), mode)
  }
}

function withAlpha(hex, alpha) {
  const h = hex.replace('#', '')
  const base = h.length === 8 ? parseInt(h.slice(6), 16) / 255 : 1
  return `#${h.slice(0, 6)}${Math.round(base * alpha * 255).toString(16).padStart(2, '0')}`
}

const num = (value) => (value === 'full' ? 9999 : Number(value))
const prettyPrimitive = (ref) => (ref ? ref.replace(/^prim-color:color\//, '').replace(/^sys-color:color\//, '') : '')
const banner = (source, what) =>
  `// Сгенерировано scripts/sync-design-tokens.mjs из ${source} — ${what}.\n// Руками не править: перезапустите скрипт.\n`

/* ---------- запись ---------- */

const { texts, source } = await readDumps()
const collections = Object.fromEntries(FILES.map((name) => [name, parse(texts[name])]))
const resolve = makeResolver(collections)
const write = (file, body) => fs.writeFileSync(path.join(OUT, file), body)
const json = (value) => JSON.stringify(value, null, 2)

// Примитивы: палитра по оттенкам + чёрный и белый по прозрачности.
{
  const hues = new Map()
  const bw = { black: [], white: [] }
  for (const name of collections['prim-color'].rows.keys()) {
    const value = resolve('prim-color', name, 'Value').value
    const tone = name.match(/^color\/alpha\/(black|white)\/(\d+)$/)
    if (tone) {
      bw[tone[1]].push({ step: tone[2], hex: value })
      continue
    }
    const hue = name.match(/^color\/([a-z]+)\/(solid|alpha)\/(\d+)$/)
    if (!hue) continue
    if (!hues.has(hue[1])) hues.set(hue[1], { name: hue[1], solid: [], alpha: [] })
    hues.get(hue[1])[hue[2]].push({ step: hue[3], hex: value })
  }
  write(
    'primitives.ts',
    banner(source, collections['prim-color'].figma) +
      `export interface PrimitiveStep { step: string; hex: string }\n` +
      `export interface PrimitiveHue { name: string; solid: PrimitiveStep[]; alpha: PrimitiveStep[] }\n\n` +
      `export const PRIMITIVE_HUES: PrimitiveHue[] = ${json([...hues.values()])}\n\n` +
      `export const PRIMITIVE_BLACK_WHITE: { black: PrimitiveStep[]; white: PrimitiveStep[] } = ${json(bw)}\n`,
  )
}

// Бренд: что меняется по модам, а что во всех модах одно и то же.
{
  const { modes, figma } = collections['brand-color']
  const varying = []
  const fixed = []
  for (const name of collections['brand-color'].rows.keys()) {
    const byMode = Object.fromEntries(modes.map((mode) => [mode, resolve('brand-color', name, mode).value]))
    if (new Set(Object.values(byMode)).size > 1) varying.push({ name, byMode })
    else fixed.push({ name, hex: byMode[modes[0]] })
  }
  write(
    'brand-color-tokens.ts',
    banner(source, figma) +
      `// Приложение использует моду ${modes[0]}: её значения сведены в --grass и соседей в src/index.css.\n\n` +
      `export const BRAND_MODES = ${JSON.stringify(modes)} as const\n` +
      `export type BrandMode = (typeof BRAND_MODES)[number]\n\n` +
      `export interface BrandColorToken {\n  name: string\n  byMode: Record<BrandMode, string>\n}\n\n` +
      `export const BRAND_COLOR_TOKENS: BrandColorToken[] = ${json(varying)}\n\n` +
      `export interface StaticColorToken { name: string; hex: string }\n\n` +
      `export const STATIC_COLOR_TOKENS: StaticColorToken[] = ${json(fixed)}\n`,
  )
}

// Скругления бренда по модам плотности.
{
  const { modes, figma } = collections['brand-rounding']
  const tokens = [...collections['brand-rounding'].rows.keys()].map((name) => ({
    name,
    byDensity: Object.fromEntries(modes.map((mode) => [mode, num(resolve('brand-rounding', name, mode).value)])),
  }))
  write(
    'rounding-tokens.ts',
    banner(source, figma) +
      `// Приложение использует моду Medium: rounded-card = rounding/xl, rounded-control = rounding/m,\n` +
      `// rounded-chip = rounding/xs (tailwind.config.ts).\n\n` +
      `export const ROUNDING_DENSITIES = ${JSON.stringify(modes)} as const\n` +
      `export type RoundingDensity = (typeof ROUNDING_DENSITIES)[number]\n\n` +
      `export interface RoundingModeToken {\n  name: string\n  byDensity: Record<RoundingDensity, number>\n}\n\n` +
      `export const ROUNDING_MODE_TOKENS: RoundingModeToken[] = ${json(tokens)}\n`,
  )
}

// Сырые шкалы.
{
  const values = (collection, prefix) =>
    [...collections[collection].rows.keys()]
      .filter((name) => name.startsWith(prefix))
      .map((name) => resolve(collection, name, 'Value').value)
  const numbers = (list) => list.map(num)
  const weights = [...collections['prim-type'].rows.keys()]
    .filter((name) => name.startsWith('typography/font-weight/'))
    .map((name) => ({ name: name.split('/').pop(), value: Number(resolve('prim-type', name, 'Value').value) }))
  const rounding = values('prim-rounding', 'rounding/').map((v) => (v === 'full' || Number(v) >= 9999 ? 'full' : Number(v)))

  write(
    'scale-tokens.ts',
    banner(source, 'Primitives ・ Spacing · Rounding · Size · Typography') +
      `export const SPACING_SCALE: number[] = ${JSON.stringify(numbers(values('prim-spacing', 'spacing/')))}\n\n` +
      `export const ROUNDING_SCALE: (number | 'full')[] = ${JSON.stringify(rounding)}\n\n` +
      `export const SIZE_SCALE: number[] = ${JSON.stringify(numbers(values('prim-size', 'size/')))}\n\n` +
      `export const FONT_WEIGHT_SCALE: { name: string; value: number }[] = ${JSON.stringify(weights)}\n\n` +
      `export const FONT_SIZE_SCALE: number[] = ${JSON.stringify(numbers(values('prim-type', 'typography/font-size/')))}\n\n` +
      `export const LINE_HEIGHT_SCALE: number[] = ${JSON.stringify(numbers(values('prim-type', 'typography/line-height/')))}\n\n` +
      `export const LETTER_SPACING_SCALE: number[] = ${JSON.stringify(numbers(values('prim-type', 'typography/letter-spacing/')))}\n\n` +
      `export const PARAGRAPH_SPACING_SCALE: number[] = ${JSON.stringify(numbers(values('prim-type', 'typography/paragraph-spacing/')))}\n`,
  )
}

// Семантика темы: Light/Dark, сгруппировано по первым двум сегментам пути.
{
  const { figma } = collections['sys-theme']
  const groups = new Map()
  for (const name of collections['sys-theme'].rows.keys()) {
    const namespace = name.split('/').slice(0, 2).join('/')
    const light = resolve('sys-theme', name, 'Light')
    const dark = resolve('sys-theme', name, 'Dark')
    if (!groups.has(namespace)) groups.set(namespace, { namespace, tokens: [] })
    groups.get(namespace).tokens.push({
      name,
      light: light.value,
      dark: dark.value,
      lightPrimitive: prettyPrimitive(light.primitive),
      darkPrimitive: prettyPrimitive(dark.primitive),
    })
  }
  write(
    'semantic-tokens.ts',
    banner(source, figma) +
      `// Значения, зависящие от бренда и статуса, разрешены в модах ${collections['brand-color'].modes[0]} и ${collections['sys-status'].modes[0]}.\n` +
      `export interface SemanticToken { name: string; light: string; dark: string; lightPrimitive: string; darkPrimitive: string }\n` +
      `export interface SemanticGroup { namespace: string; tokens: SemanticToken[] }\n\n` +
      `export const SEMANTIC_GROUPS: SemanticGroup[] = ${json([...groups.values()])}\n`,
  )
}

// Типографика: семейства из Brand ・ Typography, шкала из System ・ Responsive.
{
  const responsive = collections['sys-responsive']
  const steps = new Map()
  for (const name of responsive.rows.keys()) {
    const match = name.match(/^typography\/(.+)\/(font-size|line-height|letter-spacing)$/)
    if (!match) continue
    const [, step, prop] = match
    if (!steps.has(step)) steps.set(step, { name: step, desktop: {}, mobile: {} })
    const key = { 'font-size': 'fontSize', 'line-height': 'lineHeight', 'letter-spacing': 'letterSpacing' }[prop]
    steps.get(step).desktop[key] = Number(resolve('sys-responsive', name, 'Desktop').value)
    steps.get(step).mobile[key] = Number(resolve('sys-responsive', name, 'Mobile').value)
  }
  const weight = (w) => Number(resolve('sys-responsive', `typography/font-weight/${w}`, 'Desktop').value)
  for (const step of steps.values()) {
    for (const size of [step.desktop, step.mobile]) size.letterSpacing ??= 0
  }
  write(
    'typography-scale-tokens.ts',
    banner(source, `${collections['brand-type'].figma} + ${responsive.figma}`) +
      `export const FONT_FAMILY_MODES = ${JSON.stringify(collections['brand-type'].modes)} as const\n` +
      `export type FontFamilyMode = (typeof FONT_FAMILY_MODES)[number]\n\n` +
      `export interface TypeStep {\n  name: string\n  desktop: { fontSize: number; lineHeight: number; letterSpacing: number }\n  mobile: { fontSize: number; lineHeight: number; letterSpacing: number }\n}\n\n` +
      `export const TYPE_SCALE: TypeStep[] = ${json([...steps.values()])}\n\n` +
      `export const TYPE_WEIGHTS = { medium: ${weight('medium')}, semibold: ${weight('semibold')} }\n`,
  )
}

console.log(`Токены синхронизированы из ${source}`)
