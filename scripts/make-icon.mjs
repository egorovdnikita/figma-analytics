/**
 * Иконка приложения: белая macOS-плитка и глиф chart-2 (Bold) цветом
 * --box-palette-violet-solid-500 из дизайн-системы box-ui.
 *
 * Рисуем SVG и растеризуем его Electron'ом — он здесь всё равно есть, а
 * сторонний конвертер SVG→PNG тянуть ради одной картинки незачем.
 *
 *   npx electron scripts/make-icon.mjs
 */
import { app, BrowserWindow } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SIZE = 1024
const OUT = path.join(ROOT, 'build', 'icon.png')

/** color/violet/solid/500 → --box-palette-violet-solid-500 */
const VIOLET = '#8b5cf6'

/** Глиф Solar «chart-2», стиль Bold, viewBox 24×24 (packages/icons в box-ui). */
const GLYPH =
  'M17.293 2.293C17 2.586 17 3.057 17 4v13c0 .943 0 1.414.293 1.707S18.057 19 19 19s1.414 0 1.707-.293' +
  'S21 17.943 21 17V4c0-.943 0-1.414-.293-1.707S19.943 2 19 2s-1.414 0-1.707.293M10 7c0-.943 0-1.414.293-1.707' +
  'S11.057 5 12 5s1.414 0 1.707.293S14 6.057 14 7v10c0 .943 0 1.414-.293 1.707S12.943 19 12 19s-1.414 0-1.707-.293' +
  'S10 17.943 10 17zM3.293 9.293C3 9.586 3 10.057 3 11v6c0 .943 0 1.414.293 1.707S4.057 19 5 19s1.414 0 1.707-.293' +
  'S7 17.943 7 17v-6c0-.943 0-1.414-.293-1.707S5.943 9 5 9s-1.414 0-1.707.293M3 21.25a.75.75 0 0 0 0 1.5h18a.75.75 0 0 0 0-1.5z'

/**
 * Форма плитки macOS — суперэллипс, а не скруглённый прямоугольник: у обычного
 * radius заметен стык дуги с прямой стороной, и иконка выбивается из дока.
 * Сетка Big Sur: холст 1024, плитка 824 по центру (поля по 100).
 */
function squircle(cx, cy, half, exponent = 5, steps = 720) {
  const points = []
  for (let i = 0; i < steps; i += 1) {
    const t = (i / steps) * Math.PI * 2
    const cos = Math.cos(t)
    const sin = Math.sin(t)
    const x = cx + half * Math.sign(cos) * Math.abs(cos) ** (2 / exponent)
    const y = cy + half * Math.sign(sin) * Math.abs(sin) ** (2 / exponent)
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`)
  }
  return `M${points.join('L')}Z`
}

const TILE = 824

/* Границы самого глифа внутри viewBox 24×24: у chart-2 есть воздух по краям,
 * и если масштабировать по viewBox, рисунок на плитке выглядит мелким и
 * смещённым. Поэтому считаем по содержимому — столбики и база. */
const GLYPH_BOX = { x: 3, y: 2, width: 18.75, height: 20.75 }
/** Доля плитки, которую занимает глиф по высоте. */
const GLYPH_RATIO = 0.58

const glyphScale = (TILE * GLYPH_RATIO) / GLYPH_BOX.height
const glyphX = SIZE / 2 - (GLYPH_BOX.x + GLYPH_BOX.width / 2) * glyphScale
const glyphY = SIZE / 2 - (GLYPH_BOX.y + GLYPH_BOX.height / 2) * glyphScale

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <filter id="tile-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000" flood-opacity="0.16"/>
    </filter>
  </defs>
  <path d="${squircle(SIZE / 2, SIZE / 2, TILE / 2)}" fill="#ffffff" filter="url(#tile-shadow)"/>
  <g transform="translate(${glyphX} ${glyphY}) scale(${glyphScale})">
    <path d="${GLYPH}" fill="${VIOLET}"/>
  </g>
</svg>`

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: SIZE,
    height: SIZE,
    show: false,
    transparent: true,
    frame: false,
    webPreferences: { offscreen: true },
  })

  await win.loadURL(
    'data:text/html;charset=utf-8,' +
      encodeURIComponent(
        `<html><body style="margin:0;background:transparent">${svg}</body></html>`,
      ),
  )

  const image = await win.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE })
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, image.toPNG())

  const { width, height } = image.getSize()
  console.log(`${path.relative(ROOT, OUT)} — ${width}×${height}`)
  app.exit(0)
})
