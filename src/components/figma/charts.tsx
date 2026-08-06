import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { cn } from '@/lib/cn'

/* ---------- измерение контейнера ----------
 * Графики рисуем в пиксельных координатах, а не растягиваем viewBox: иначе
 * подписи и толщина линий поплывут вместе с масштабом. */
export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0
      setWidth((prev) => (Math.abs(prev - next) > 0.5 ? next : prev))
    })
    observer.observe(node)
    setWidth(node.getBoundingClientRect().width)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}

/* ---------- общие настройки отображения ---------- */

const VizPrefsContext = createContext<{ tablesByDefault: boolean }>({ tablesByDefault: false })

export function VizPrefsProvider({
  tablesByDefault,
  children,
}: {
  tablesByDefault: boolean
  children: ReactNode
}) {
  return <VizPrefsContext.Provider value={{ tablesByDefault }}>{children}</VizPrefsContext.Provider>
}

/* ---------- каркас карточки ---------- */

export function ChartCard({
  title,
  subtitle,
  action,
  legend,
  table,
  children,
  className,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  legend?: ReactNode
  /** Таблица значений — обязательная опора: в светлой теме часть слотов палитры
   * идёт ниже контраста 3:1, поэтому цвет никогда не единственный способ
   * прочитать величину. */
  table?: ReactNode
  children: ReactNode
  className?: string
}) {
  const { tablesByDefault } = useContext(VizPrefsContext)
  const [showTable, setShowTable] = useState(tablesByDefault && Boolean(table))

  // Переключатель в настройках меняет режим уже открытых карточек, но ручной
  // выбор внутри карточки остаётся за пользователем до следующей смены настройки.
  useEffect(() => {
    setShowTable(tablesByDefault && Boolean(table))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablesByDefault])

  return (
    <section className={cn('viz rounded-card bg-surface p-4', className)}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-[12px] text-muted">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {action}
          {table ? (
            <button
              type="button"
              onClick={() => setShowTable((v) => !v)}
              className="h-7 rounded-chip px-2.5 text-[12px] text-muted hover:bg-[var(--sunken)] hover:text-ink"
              aria-pressed={showTable}
            >
              {showTable ? 'График' : 'Таблица'}
            </button>
          ) : null}
        </div>
      </header>

      {showTable && table ? (
        <div className="scroll-thin max-h-[320px] overflow-auto">{table}</div>
      ) : (
        children
      )}

      {legend && !showTable ? <div className="mt-3">{legend}</div> : null}
    </section>
  )
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-[12px] text-muted">
          <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: item.color }} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

/* ---------- тултип ---------- */

interface TooltipState {
  x: number
  y: number
  content: ReactNode
}

function Tooltip({ state, width }: { state: TooltipState | null; width: number }) {
  if (!state) return null
  const flip = state.x > width * 0.6
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-[128px] rounded-[10px] bg-[var(--ink)] px-3 py-2 text-[12px] leading-relaxed text-[var(--canvas)] shadow-pop"
      style={{
        left: flip ? undefined : state.x + 12,
        right: flip ? width - state.x + 12 : undefined,
        top: Math.max(0, state.y - 12),
      }}
    >
      {state.content}
    </div>
  )
}

/* ---------- общая геометрия ---------- */

const AXIS_BAND = 22
const PAD_TOP = 8

function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0]
  const raw = max / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  // Все величины здесь счётные, поэтому шаг всегда целый: дробный шаг давал бы
  // повторяющиеся подписи вроде «0, 0, 1, 1» после округления.
  const step = Math.max(
    1,
    Math.ceil([1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? magnitude * 10),
  )

  // Верхнее деление обязано быть не меньше максимума ряда: иначе точки выше
  // последнего деления уезжают за пределы области и линия рвётся.
  const ticks: number[] = []
  for (let value = 0; ; value += step) {
    ticks.push(Math.round(value * 100) / 100)
    if (value >= max) break
    if (ticks.length > 24) break
  }
  return ticks
}

function formatCompact(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(Math.round(value))
}

/** Столбец со скруглённой вершиной и прямым основанием на базовой линии. */
function columnPath(x: number, y: number, w: number, h: number, r = 4) {
  const radius = Math.min(r, w / 2, Math.max(0, h))
  if (h <= 0) return ''
  return [
    `M${x},${y + h}`,
    `L${x},${y + radius}`,
    `Q${x},${y} ${x + radius},${y}`,
    `L${x + w - radius},${y}`,
    `Q${x + w},${y} ${x + w},${y + radius}`,
    `L${x + w},${y + h}`,
    'Z',
  ].join(' ')
}

/* ---------- линейный / площадной график ---------- */

export interface SeriesPoint {
  label: string
  value: number
}

export function LineChart({
  series,
  height = 180,
  formatValue = formatCompact,
  area = false,
}: {
  series: { name: string; color: string; points: SeriesPoint[] }[]
  height?: number
  formatValue?: (value: number) => string
  area?: boolean
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const areaGradientId = useId()

  const points = series[0]?.points ?? []
  const count = points.length
  const max = Math.max(1, ...series.flatMap((s) => s.points.map((p) => p.value)))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1] || 1

  const gutter = 34
  const plotW = Math.max(0, width - gutter - 8)
  const plotH = height - AXIS_BAND - PAD_TOP
  const stepX = count > 1 ? plotW / (count - 1) : 0
  const xAt = (i: number) => gutter + (count > 1 ? i * stepX : plotW / 2)
  const yAt = (value: number) => PAD_TOP + plotH - (value / top) * plotH

  const onMove = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (count === 0 || plotW <= 0) return
      const rect = event.currentTarget.getBoundingClientRect()
      const x = event.clientX - rect.left
      const index = count > 1 ? Math.round((x - gutter) / stepX) : 0
      const clamped = Math.max(0, Math.min(count - 1, index))
      setActiveIndex(clamped)
      setTooltip({
        x: xAt(clamped),
        y: event.clientY - rect.top,
        content: (
          <div>
            <p className="mb-0.5 font-medium">{points[clamped]?.label}</p>
            {series.map((s) => (
              <p key={s.name} className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />
                {s.name}: {formatValue(s.points[clamped]?.value ?? 0)}
              </p>
            ))}
          </div>
        ),
      })
    },
    [count, plotW, stepX, series, points, formatValue],
  )

  return (
    <div ref={ref} className="relative">
      {width > 0 ? (
        <svg
          width={width}
          height={height}
          onMouseMove={onMove}
          onMouseLeave={() => {
            setTooltip(null)
            setActiveIndex(null)
          }}
          role="img"
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={gutter}
                x2={width - 8}
                y1={yAt(tick)}
                y2={yAt(tick)}
                stroke="var(--viz-grid)"
                strokeWidth={1}
                opacity={tick === 0 ? 1 : 0.55}
              />
              <text x={gutter - 8} y={yAt(tick) + 3.5} textAnchor="end" className="fill-[var(--viz-muted)] text-[10px] [font-variant-numeric:tabular-nums]">
                {formatValue(tick)}
              </text>
            </g>
          ))}

          {area && series.length === 1
            ? (() => {
                const s = series[0]
                const d = [
                  `M${xAt(0)},${PAD_TOP + plotH}`,
                  ...s.points.map((p, i) => `L${xAt(i)},${yAt(p.value)}`),
                  `L${xAt(count - 1)},${PAD_TOP + plotH}`,
                  'Z',
                ].join(' ')
                // Градиент, гаснущий к базовой линии: заливка поддерживает линию,
                // но не спорит с ней по весу, как ровный процент прозрачности.
                return (
                  <>
                    <defs>
                      <linearGradient id={areaGradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                        <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <path d={d} fill={`url(#${areaGradientId})`} />
                  </>
                )
              })()
            : null}

          {series.map((s) => (
            <path
              key={s.name}
              d={s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(p.value)}`).join(' ')}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {activeIndex !== null ? (
            <>
              <line
                x1={xAt(activeIndex)}
                x2={xAt(activeIndex)}
                y1={PAD_TOP}
                y2={PAD_TOP + plotH}
                stroke="var(--viz-axis)"
                strokeWidth={1}
              />
              {series.map((s) => (
                <g key={s.name}>
                  <circle
                    cx={xAt(activeIndex)}
                    cy={yAt(s.points[activeIndex]?.value ?? 0)}
                    r={9}
                    fill={s.color}
                    opacity={0.16}
                  />
                  <circle
                    cx={xAt(activeIndex)}
                    cy={yAt(s.points[activeIndex]?.value ?? 0)}
                    r={4.5}
                    fill={s.color}
                    stroke="var(--viz-surface)"
                    strokeWidth={2.5}
                  />
                </g>
              ))}
            </>
          ) : null}

          {points.map((point, i) =>
            i % Math.ceil(count / 6 || 1) === 0 ? (
              <text
                key={point.label + i}
                x={xAt(i)}
                y={height - 6}
                textAnchor="middle"
                className="fill-[var(--viz-muted)] text-[10px]"
              >
                {point.label}
              </text>
            ) : null,
          )}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      <Tooltip state={tooltip} width={width} />
    </div>
  )
}

/* ---------- столбцы с накоплением ---------- */

export function StackedBars({
  buckets,
  series,
  height = 200,
}: {
  buckets: { label: string; key: string }[]
  series: { name: string; color: string; values: number[] }[]
  height?: number
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [hover, setHover] = useState<number | null>(null)

  const totals = buckets.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0))
  const max = Math.max(1, ...totals)
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1] || 1

  const gutter = 34
  const plotW = Math.max(0, width - gutter - 8)
  const plotH = height - AXIS_BAND - PAD_TOP
  const band = buckets.length > 0 ? plotW / buckets.length : 0
  const barW = Math.min(24, band * 0.62)
  const GAP = 2 // разрыв в цвет поверхности между сегментами стопки

  return (
    <div ref={ref} className="relative">
      {width > 0 ? (
        <svg width={width} height={height} role="img">
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={gutter}
                x2={width - 8}
                y1={PAD_TOP + plotH - (tick / top) * plotH}
                y2={PAD_TOP + plotH - (tick / top) * plotH}
                stroke="var(--viz-grid)"
                strokeWidth={1}
                opacity={tick === 0 ? 1 : 0.55}
              />
              <text x={gutter - 8} y={PAD_TOP + plotH - (tick / top) * plotH + 3.5} textAnchor="end" className="fill-[var(--viz-muted)] text-[10px] [font-variant-numeric:tabular-nums]">
                {formatCompact(tick)}
              </text>
            </g>
          ))}

          {buckets.map((bucket, i) => {
            const x = gutter + i * band + (band - barW) / 2
            let cursorY = PAD_TOP + plotH
            const segments = series
              .map((s) => ({ s, value: s.values[i] ?? 0 }))
              .filter((entry) => entry.value > 0)

            return (
              <g
                key={bucket.key}
                onMouseEnter={(event) => {
                  const rect = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                  setHover(i)
                  setTooltip({
                    x: gutter + i * band + band / 2,
                    y: event.clientY - rect.top,
                    content: (
                      <div>
                        <p className="mb-0.5 font-medium">{bucket.label}</p>
                        {series.map((s) => (
                          <p key={s.name} className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="h-2 w-2 rounded-[2px]" style={{ background: s.color }} />
                            {s.name}: {s.values[i] ?? 0}
                          </p>
                        ))}
                        <p className="mt-0.5 border-t border-white/20 pt-0.5">Всего: {totals[i]}</p>
                      </div>
                    ),
                  })
                }}
                onMouseLeave={() => {
                  setHover(null)
                  setTooltip(null)
                }}
              >
                {/* Зона наведения шире столбца; под курсором она мягко
                    подсвечивается, чтобы было видно, какой период читается. */}
                <rect
                  x={gutter + i * band}
                  y={PAD_TOP}
                  width={band}
                  height={plotH}
                  rx={6}
                  fill={hover === i ? 'var(--viz-grid)' : 'transparent'}
                  opacity={hover === i ? 0.5 : 1}
                />
                {segments.map(({ s, value }, segIndex) => {
                  const rawH = (value / top) * plotH
                  const h = Math.max(1, rawH - (segIndex === segments.length - 1 ? 0 : GAP))
                  cursorY -= rawH
                  const isTop = segIndex === segments.length - 1
                  return (
                    <path
                      key={s.name}
                      d={isTop ? columnPath(x, cursorY, barW, h) : `M${x},${cursorY} h${barW} v${h} h${-barW} Z`}
                      fill={s.color}
                      opacity={hover === null || hover === i ? 1 : 0.32}
                    />
                  )
                })}
              </g>
            )
          })}

          {buckets.map((bucket, i) =>
            i % Math.ceil(buckets.length / 8 || 1) === 0 ? (
              <text key={bucket.key} x={gutter + i * band + band / 2} y={height - 6} textAnchor="middle" className="fill-[var(--viz-muted)] text-[10px]">
                {bucket.label}
              </text>
            ) : null,
          )}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      <Tooltip state={tooltip} width={width} />
    </div>
  )
}

/* ---------- горизонтальный рейтинг ---------- */

export function HBars({
  items,
  color = 'var(--viz-1)',
  formatValue = (v: number) => String(v),
  max: maxOverride,
}: {
  items: { label: string; value: number; hint?: string }[]
  color?: string
  formatValue?: (value: number) => string
  max?: number
}) {
  const max = Math.max(1, maxOverride ?? Math.max(...items.map((i) => i.value), 1))
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="w-[38%] shrink-0 truncate text-[13px] text-ink" title={item.label}>
            {item.label}
          </span>
          <div className="relative h-3 flex-1 overflow-hidden rounded-[4px] bg-[var(--sunken)]">
            <div
              className="h-full rounded-[4px]"
              style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, background: color }}
              title={item.hint}
            />
          </div>
          <span className="w-12 shrink-0 text-right text-[13px] text-muted [font-variant-numeric:tabular-nums]">
            {formatValue(item.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

/* ---------- теплокарта «день недели × час» ---------- */

export function Heatmap({
  rows,
  grid,
  max,
}: {
  rows: string[]
  grid: number[][]
  max: number
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const { ref, width } = useMeasure<HTMLDivElement>()

  const stepColor = (value: number) => {
    if (value === 0) return 'var(--viz-seq-0)'
    const ratio = value / max
    if (ratio <= 0.16) return 'var(--viz-seq-1)'
    if (ratio <= 0.33) return 'var(--viz-seq-2)'
    if (ratio <= 0.5) return 'var(--viz-seq-3)'
    if (ratio <= 0.68) return 'var(--viz-seq-4)'
    if (ratio <= 0.85) return 'var(--viz-seq-5)'
    return 'var(--viz-seq-6)'
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex flex-col gap-1">
        {rows.map((row, rowIndex) => (
          <div key={row} className="flex items-center gap-1">
            <span className="w-6 shrink-0 text-[10px] text-muted">{row}</span>
            <div className="flex flex-1 gap-[3px]">
              {grid[rowIndex].map((value, hour) => (
                <div
                  key={hour}
                  className="h-[18px] flex-1 rounded-[4px] transition-transform hover:scale-[1.12]"
                  style={{ background: stepColor(value) }}
                  onMouseEnter={(event) => {
                    const parent = (event.currentTarget.offsetParent as HTMLElement) ?? null
                    const rect = event.currentTarget.getBoundingClientRect()
                    const parentRect = parent?.getBoundingClientRect()
                    setTooltip({
                      x: rect.left - (parentRect?.left ?? 0),
                      y: rect.top - (parentRect?.top ?? 0),
                      content: `${row}, ${String(hour).padStart(2, '0')}:00 — ${value}`,
                    })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="mt-1 flex items-center gap-1 pl-7">
          {[0, 6, 12, 18, 23].map((hour) => (
            <span key={hour} className="flex-1 text-[10px] text-muted" style={{ flexGrow: hour === 23 ? 0 : 1 }}>
              {String(hour).padStart(2, '0')}
            </span>
          ))}
        </div>
      </div>
      <Tooltip state={tooltip} width={width} />
    </div>
  )
}

/* ---------- кольцевая диаграмма (только для доли целого, ≤6 сегментов) ---------- */

export function Donut({
  segments,
  size = 132,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number; color: string }[]
  size?: number
  centerLabel?: string
  centerValue?: string
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const total = segments.reduce((sum, s) => sum + s.value, 0)
  const radius = size / 2
  const thickness = 18
  const inner = radius - thickness
  let angle = -Math.PI / 2

  const arc = (value: number) => {
    const sweep = total > 0 ? (value / total) * Math.PI * 2 : 0
    const start = angle
    const end = angle + sweep
    angle = end
    const large = sweep > Math.PI ? 1 : 0
    const p = (a: number, r: number) => `${radius + Math.cos(a) * r},${radius + Math.sin(a) * r}`
    return `M${p(start, radius)} A${radius},${radius} 0 ${large} 1 ${p(end, radius)} L${p(end, inner)} A${inner},${inner} 0 ${large} 0 ${p(start, inner)} Z`
  }

  return (
    <div className="relative flex items-center gap-4">
      <svg width={size} height={size} role="img" className="shrink-0">
        {segments.map((segment) => (
          <path
            key={segment.label}
            d={arc(segment.value)}
            fill={segment.color}
            stroke="var(--viz-surface)"
            strokeWidth={3}
            onMouseEnter={(event) => {
              const rect = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
              setTooltip({
                x: event.clientX - rect.left,
                y: event.clientY - rect.top,
                content: `${segment.label}: ${segment.value} (${total ? Math.round((segment.value / total) * 100) : 0}%)`,
              })
            }}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}
        {centerValue ? (
          <>
            <text x={radius} y={radius - 2} textAnchor="middle" className="fill-[var(--ink)] text-[32px] [font-family:var(--font-display)]">
              {centerValue}
            </text>
            <text x={radius} y={radius + 14} textAnchor="middle" className="fill-[var(--viz-muted)] text-[10px]">
              {centerLabel}
            </text>
          </>
        ) : null}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2 text-[13px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: segment.color }} />
            <span className="min-w-0 flex-1 truncate text-ink">{segment.label}</span>
            <span className="shrink-0 text-muted [font-variant-numeric:tabular-nums]">
              {segment.value} · {total ? Math.round((segment.value / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
      <Tooltip state={tooltip} width={size} />
    </div>
  )
}

/* ---------- спарклайн и плитка показателя ---------- */

export function Sparkline({ values, color = 'var(--viz-1)', width = 72, height = 22 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const gradientId = useId()
  if (values.length < 2) return <div style={{ width, height }} />

  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const span = max - min || 1
  const step = width / (values.length - 1)
  const yAt = (value: number) => height - ((value - min) / span) * (height - 5) - 2.5
  const line = values.map((value, i) => `${i === 0 ? 'M' : 'L'}${i * step},${yAt(value)}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const lastX = (values.length - 1) * step
  const lastY = yAt(values[values.length - 1])

  return (
    <svg width={width} height={height} aria-hidden className="shrink-0 overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.24} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Точка на последнем значении — глаз сразу находит «сейчас». */}
      <circle cx={lastX} cy={lastY} r={2.75} fill={color} stroke="var(--viz-surface)" strokeWidth={2} />
    </svg>
  )
}

export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
  spark,
  invertDelta = false,
  hint,
}: {
  label: string
  value: string
  /** null — сравнивать не с чем (в прошлом периоде было ноль). */
  delta?: number | null
  deltaLabel?: string
  spark?: number[]
  /** true — рост это плохо (например, время ответа). */
  invertDelta?: boolean
  hint?: string
}) {
  const hasDelta = delta !== undefined && delta !== null && Number.isFinite(delta)
  const value_ = delta as number
  const positive = hasDelta && (invertDelta ? value_ < 0 : value_ > 0)
  const negative = hasDelta && (invertDelta ? value_ > 0 : value_ < 0)
  const tone = positive ? 'var(--viz-good)' : negative ? 'var(--viz-bad)' : 'var(--muted)'

  return (
    <div className="viz relative overflow-hidden rounded-card bg-surface p-4">
      <p className="text-[13px] text-muted">{label}</p>

      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="font-display display-lg text-ink">{value}</p>
        {spark && spark.length > 1 ? (
          <Sparkline values={spark} color={hasDelta ? tone : 'var(--viz-1)'} width={84} height={28} />
        ) : null}
      </div>

      {hasDelta ? (
        <div className="mt-3.5 flex items-center gap-1.5">
          {/* Дельта — бейдж, а не строка текста: так она читается как отдельная
              величина и не сливается с подписью периода. */}
          <span
            className="inline-flex h-[22px] shrink-0 items-center gap-1 rounded-chip px-2 text-[12px] font-medium [font-variant-numeric:tabular-nums]"
            style={{ color: tone, background: `color-mix(in srgb, ${tone} 12%, transparent)` }}
          >
            <ArrowGlyph up={value_ > 0} flat={value_ === 0} />
            {value_ > 0 ? '+' : ''}
            {value_.toFixed(0)}%
          </span>
          {deltaLabel ? <span className="truncate text-[12px] text-faint">{deltaLabel}</span> : null}
        </div>
      ) : delta === null ? (
        <p className="mt-3.5 text-[12px] text-faint">Нет данных за прошлый период</p>
      ) : hint ? (
        <p className="mt-3.5 text-[12px] text-faint">{hint}</p>
      ) : null}
    </div>
  )
}

/** Стрелка направления. Треугольники из шрифта (▲▼) сидят на разной высоте и
    прыгают между платформами — рисуем свою. */
function ArrowGlyph({ up, flat }: { up: boolean; flat: boolean }) {
  if (flat) {
    return (
      <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden>
        <path d="M2 5h6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" aria-hidden>
      <path
        d={up ? 'M5 8V2.5M2.5 5L5 2.5 7.5 5' : 'M5 2v5.5M2.5 5L5 7.5 7.5 5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/* ---------- состояния загрузки и пустоты ---------- */

/** Скелетон формы контента вместо крутящегося индикатора: экран не «прыгает»,
    когда данные приезжают, потому что каркас уже занимает нужное место. */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('animate-pulse rounded-control bg-[var(--sunken)]', className)} style={style} />
}

export function StatTileSkeleton() {
  return (
    <div className="viz rounded-card bg-surface p-4">
      <Skeleton className="h-3.5 w-24" />
      <div className="mt-2 flex items-end justify-between gap-3">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-7 w-20" />
      </div>
      <Skeleton className="mt-3.5 h-[22px] w-28 rounded-chip" />
    </div>
  )
}

export function ChartCardSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="viz rounded-card bg-surface p-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-1.5 h-3 w-56" />
      <Skeleton className="mt-4 w-full" style={{ height }} />
    </div>
  )
}

export function DashboardSkeleton({ tiles = 8 }: { tiles?: number }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: tiles }, (_, index) => (
          <StatTileSkeleton key={index} />
        ))}
      </div>
      <ChartCardSkeleton />
      <div className="grid grid-cols-2 gap-3">
        <ChartCardSkeleton height={170} />
        <ChartCardSkeleton height={170} />
      </div>
    </div>
  )
}

/** Пустое состояние с понятным следующим шагом, а не одной серой строкой. */
export function EmptyBlock({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-card bg-surface px-6 py-12 text-center">
      {icon ? (
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--sunken)] text-faint">
          {icon}
        </span>
      ) : null}
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      {description ? (
        <p className="max-w-[380px] text-[13px] leading-relaxed text-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}

/* ---------- сравнение текущего и прошлого периода ---------- */

export function ComparisonBars({
  items,
  currentLabel,
  previousLabel,
}: {
  items: { label: string; current: number; previous: number }[]
  currentLabel: string
  previousLabel: string
}) {
  const max = Math.max(1, ...items.flatMap((item) => [item.current, item.previous]))
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-baseline justify-between text-[13px]">
            <span className="text-ink">{item.label}</span>
            <span className="text-muted [font-variant-numeric:tabular-nums]">
              {item.current} / {item.previous}
            </span>
          </div>
          <div className="space-y-[3px]">
            <div className="h-2.5 rounded-[4px]" style={{ width: `${Math.max(1, (item.current / max) * 100)}%`, background: 'var(--viz-1)' }} />
            <div className="h-2.5 rounded-[4px]" style={{ width: `${Math.max(1, (item.previous / max) * 100)}%`, background: 'var(--viz-axis)' }} />
          </div>
        </div>
      ))}
      <Legend
        items={[
          { label: currentLabel, color: 'var(--viz-1)' },
          { label: previousLabel, color: 'var(--viz-axis)' },
        ]}
      />
    </div>
  )
}

/** Хук для «удержать прошлый кадр» — чтобы при перерисовке не мигал скелетон. */
export function useDeferredFlag(active: boolean, delay = 120) {
  const [flag, setFlag] = useState(active)
  useEffect(() => {
    if (active) {
      setFlag(true)
      return
    }
    const timer = setTimeout(() => setFlag(false), delay)
    return () => clearTimeout(timer)
  }, [active, delay])
  return flag
}

/* ---------- календарь активности (график вкладов) ---------- */

export function CalendarHeatmap({
  cells,
  max,
  weeks = 53,
}: {
  cells: { date: Date; key: string; count: number }[]
  max: number
  weeks?: number
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const { ref, width } = useMeasure<HTMLDivElement>()

  // Раскладываем по колонкам-неделям: строка — день недели, начиная с понедельника.
  const columns: ({ date: Date; key: string; count: number } | null)[][] = []
  let column: ({ date: Date; key: string; count: number } | null)[] = []
  const firstWeekday = (cells[0]?.date.getDay() ?? 1 + 6) % 7
  for (let i = 0; i < firstWeekday; i += 1) column.push(null)
  for (const cell of cells) {
    column.push(cell)
    if (column.length === 7) {
      columns.push(column)
      column = []
    }
  }
  if (column.length > 0) {
    while (column.length < 7) column.push(null)
    columns.push(column)
  }
  const visible = columns.slice(-weeks)

  const step = (count: number) => {
    if (count === 0) return 'var(--viz-seq-0)'
    const ratio = count / max
    if (ratio <= 0.15) return 'var(--viz-seq-1)'
    if (ratio <= 0.3) return 'var(--viz-seq-2)'
    if (ratio <= 0.5) return 'var(--viz-seq-3)'
    if (ratio <= 0.7) return 'var(--viz-seq-4)'
    if (ratio <= 0.88) return 'var(--viz-seq-5)'
    return 'var(--viz-seq-6)'
  }

  const monthLabels: { index: number; label: string }[] = []
  let lastMonth = -1
  visible.forEach((col, index) => {
    const firstReal = col.find(Boolean)
    if (!firstReal) return
    const month = firstReal.date.getMonth()
    if (month !== lastMonth) {
      monthLabels.push({ index, label: format(firstReal.date, 'LLL', { locale: ru }) })
      lastMonth = month
    }
  })

  return (
    <div ref={ref} className="relative">
      <div className="scroll-thin overflow-x-auto pb-1">
        <div className="inline-block min-w-full">
          <div className="mb-1 flex gap-[3px] pl-7">
            {visible.map((_, index) => {
              const label = monthLabels.find((entry) => entry.index === index)
              return (
                <span key={index} className="w-[12px] shrink-0 text-[9px] text-muted">
                  {label ? label.label : ''}
                </span>
              )
            })}
          </div>

          <div className="flex gap-[3px]">
            <div className="flex w-6 shrink-0 flex-col gap-[3px] text-[9px] text-muted">
              {['Пн', '', 'Ср', '', 'Пт', '', 'Вс'].map((label, index) => (
                <span key={index} className="h-[12px] leading-[12px]">
                  {label}
                </span>
              ))}
            </div>

            {visible.map((col, colIndex) => (
              <div key={colIndex} className="flex flex-col gap-[3px]">
                {col.map((cell, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="h-[12px] w-[12px] shrink-0 rounded-[3px]"
                    style={{ background: cell ? step(cell.count) : 'transparent' }}
                    onMouseEnter={(event) => {
                      if (!cell) return
                      const parent = event.currentTarget.closest('.relative') as HTMLElement | null
                      const rect = event.currentTarget.getBoundingClientRect()
                      const parentRect = parent?.getBoundingClientRect()
                      setTooltip({
                        x: rect.left - (parentRect?.left ?? 0),
                        y: rect.top - (parentRect?.top ?? 0),
                        content: `${format(cell.date, 'd MMMM yyyy', { locale: ru })} — ${cell.count}`,
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted">
        <span>меньше</span>
        {['var(--viz-seq-0)', 'var(--viz-seq-1)', 'var(--viz-seq-2)', 'var(--viz-seq-3)', 'var(--viz-seq-4)', 'var(--viz-seq-5)', 'var(--viz-seq-6)'].map(
          (color) => (
            <span key={color} className="h-[10px] w-[10px] rounded-[2px]" style={{ background: color }} />
          ),
        )}
        <span>больше</span>
      </div>

      <Tooltip state={tooltip} width={width} />
    </div>
  )
}

/* ---------- изменение позиций в рейтинге ---------- */

export function BumpChart({
  series,
  buckets,
  depth,
  colors,
  height = 200,
}: {
  series: { handle: string; points: { label: string; rank: number; value: number }[] }[]
  buckets: string[]
  depth: number
  colors: string[]
  height?: number
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  const gutter = 28
  const rightPad = 96
  const plotW = Math.max(0, width - gutter - rightPad)
  const plotH = height - AXIS_BAND - PAD_TOP
  const stepX = buckets.length > 1 ? plotW / (buckets.length - 1) : 0
  const xAt = (i: number) => gutter + i * stepX
  const yAt = (rank: number) => PAD_TOP + ((rank - 1) / Math.max(1, depth - 1)) * plotH

  return (
    <div ref={ref} className="relative">
      {width > 0 ? (
        <svg width={width} height={height} role="img">
          {Array.from({ length: depth }, (_, index) => index + 1).map((rank) => (
            <g key={rank}>
              <line x1={gutter} x2={gutter + plotW} y1={yAt(rank)} y2={yAt(rank)} stroke="var(--viz-grid)" strokeWidth={1} />
              <text x={gutter - 6} y={yAt(rank) + 3.5} textAnchor="end" className="fill-[var(--viz-muted)] text-[10px]">
                {rank}
              </text>
            </g>
          ))}

          {series.map((entry, index) => {
            const color = colors[index % colors.length]
            const dim = hover !== null && hover !== entry.handle
            return (
              <g
                key={entry.handle}
                onMouseEnter={() => setHover(entry.handle)}
                onMouseLeave={() => {
                  setHover(null)
                  setTooltip(null)
                }}
                opacity={dim ? 0.25 : 1}
              >
                <path
                  d={entry.points.map((point, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(point.rank)}`).join(' ')}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {entry.points.map((point, i) => (
                  <circle
                    key={i}
                    cx={xAt(i)}
                    cy={yAt(point.rank)}
                    r={4}
                    fill={color}
                    stroke="var(--viz-surface)"
                    strokeWidth={2}
                    onMouseEnter={(event) => {
                      const rect = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                      setTooltip({
                        x: xAt(i),
                        y: event.clientY - rect.top,
                        content: `${entry.handle} · ${point.label}: место ${point.rank}, ${point.value} событий`,
                      })
                    }}
                  />
                ))}
                <text
                  x={xAt(entry.points.length - 1) + 8}
                  y={yAt(entry.points[entry.points.length - 1]?.rank ?? 1) + 3.5}
                  className="fill-[var(--ink)] text-[10px]"
                >
                  {entry.handle.length > 13 ? `${entry.handle.slice(0, 12)}…` : entry.handle}
                </text>
              </g>
            )
          })}

          {buckets.map((label, i) =>
            i % Math.ceil(buckets.length / 6 || 1) === 0 ? (
              <text key={label + i} x={xAt(i)} y={height - 6} textAnchor="middle" className="fill-[var(--viz-muted)] text-[10px]">
                {label}
              </text>
            ) : null,
          )}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      <Tooltip state={tooltip} width={width} />
    </div>
  )
}

/* ---------- диаграмма рассеяния ---------- */

export function ScatterPlot({
  points,
  xLabel,
  yLabel,
  height = 220,
  onSelect,
}: {
  points: { label: string; x: number; y: number; size?: number }[]
  xLabel: string
  yLabel: string
  height?: number
  onSelect?: (label: string) => void
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const maxX = Math.max(1, ...points.map((point) => point.x))
  const maxY = Math.max(1, ...points.map((point) => point.y))
  const ticksX = niceTicks(maxX, 4)
  const ticksY = niceTicks(maxY, 4)
  const topX = ticksX[ticksX.length - 1] || 1
  const topY = ticksY[ticksY.length - 1] || 1

  const gutter = 36
  const plotW = Math.max(0, width - gutter - 12)
  const plotH = height - AXIS_BAND - PAD_TOP
  const xAt = (value: number) => gutter + (value / topX) * plotW
  const yAt = (value: number) => PAD_TOP + plotH - (value / topY) * plotH

  return (
    <div ref={ref} className="relative">
      {width > 0 ? (
        <svg width={width} height={height} role="img">
          {ticksY.map((tick) => (
            <g key={`y${tick}`}>
              <line x1={gutter} x2={gutter + plotW} y1={yAt(tick)} y2={yAt(tick)} stroke="var(--viz-grid)" strokeWidth={1} />
              <text x={gutter - 6} y={yAt(tick) + 3.5} textAnchor="end" className="fill-[var(--viz-muted)] text-[10px] [font-variant-numeric:tabular-nums]">
                {formatCompact(tick)}
              </text>
            </g>
          ))}
          {ticksX.map((tick) => (
            <text key={`x${tick}`} x={xAt(tick)} y={height - 6} textAnchor="middle" className="fill-[var(--viz-muted)] text-[10px] [font-variant-numeric:tabular-nums]">
              {formatCompact(tick)}
            </text>
          ))}

          {points.map((point) => (
            <circle
              key={point.label}
              cx={xAt(point.x)}
              cy={yAt(point.y)}
              r={Math.max(5, Math.min(12, point.size ?? 5))}
              fill="var(--viz-1)"
              fillOpacity={0.75}
              stroke="var(--viz-surface)"
              strokeWidth={2}
              className={onSelect ? 'cursor-pointer' : undefined}
              onClick={() => onSelect?.(point.label)}
              onMouseEnter={(event) => {
                const rect = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                setTooltip({
                  x: xAt(point.x),
                  y: event.clientY - rect.top,
                  content: `${point.label} — ${xLabel}: ${point.x}, ${yLabel}: ${point.y}`,
                })
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          ))}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      <p className="mt-1 text-[11px] text-muted">
        по горизонтали — {xLabel}, по вертикали — {yLabel}
      </p>
      <Tooltip state={tooltip} width={width} />
    </div>
  )
}

/* ---------- малые множители: спарклайн на каждого ---------- */

export function SmallMultiples({
  items,
  color = 'var(--viz-1)',
}: {
  items: { label: string; values: number[]; total: number }[]
  color?: string
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="w-[38%] shrink-0 truncate text-[12.5px] text-ink" title={item.label}>
            {item.label}
          </span>
          <Sparkline values={item.values} color={color} width={96} height={24} />
          <span className="ml-auto text-[12px] text-muted [font-variant-numeric:tabular-nums]">{item.total}</span>
        </div>
      ))}
    </div>
  )
}

/* ---------- матрица год × месяц ---------- */

const MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']

export function YearMonthGrid({
  rows,
  max,
}: {
  rows: { year: number; months: number[] }[]
  max: number
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const { ref, width } = useMeasure<HTMLDivElement>()

  const step = (value: number) => {
    if (value === 0) return 'var(--viz-seq-0)'
    const ratio = value / max
    if (ratio <= 0.15) return 'var(--viz-seq-1)'
    if (ratio <= 0.3) return 'var(--viz-seq-2)'
    if (ratio <= 0.5) return 'var(--viz-seq-3)'
    if (ratio <= 0.7) return 'var(--viz-seq-4)'
    if (ratio <= 0.88) return 'var(--viz-seq-5)'
    return 'var(--viz-seq-6)'
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-1 pl-10 text-[10px] text-muted">
        {MONTHS_SHORT.map((month) => (
          <span key={month} className="flex-1 text-center">
            {month}
          </span>
        ))}
      </div>
      <div className="mt-1 space-y-1">
        {rows.map((row) => (
          <div key={row.year} className="flex items-center gap-1">
            <span className="w-9 shrink-0 text-[10px] text-muted [font-variant-numeric:tabular-nums]">{row.year}</span>
            {row.months.map((value, month) => (
              <div
                key={month}
                className="h-7 flex-1 rounded-[5px]"
                style={{ background: step(value) }}
                onMouseEnter={(event) => {
                  const parent = event.currentTarget.closest('.relative') as HTMLElement | null
                  const rect = event.currentTarget.getBoundingClientRect()
                  const parentRect = parent?.getBoundingClientRect()
                  setTooltip({
                    x: rect.left - (parentRect?.left ?? 0),
                    y: rect.top - (parentRect?.top ?? 0),
                    content: `${MONTHS_SHORT[month]} ${row.year} — ${value}`,
                  })
                }}
                onMouseLeave={() => setTooltip(null)}
              />
            ))}
          </div>
        ))}
      </div>
      <Tooltip state={tooltip} width={width} />
    </div>
  )
}

/* ---------- двойная линия: текущий период против прошлого года ---------- */

export function DualLine({
  points,
  currentLabel,
  previousLabel,
  height = 190,
}: {
  points: { label: string; current: number; lastYear: number }[]
  currentLabel: string
  previousLabel: string
  height?: number
}) {
  return (
    <LineChart
      height={height}
      series={[
        { name: currentLabel, color: 'var(--viz-1)', points: points.map((p) => ({ label: p.label, value: p.current })) },
        { name: previousLabel, color: 'var(--viz-2)', points: points.map((p) => ({ label: p.label, value: p.lastYear })) },
      ]}
    />
  )
}

/* ---------- кольцевой индикатор с разбором факторов ---------- */

export function HealthRing({
  score,
  factors,
  size = 150,
}: {
  score: number
  factors: { key: string; label: string; score: number; detail: string }[]
  size?: number
}) {
  const radius = size / 2
  const thickness = 14
  const inner = radius - thickness
  const circumference = 2 * Math.PI * ((radius + inner) / 2)
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference

  const tone = score >= 70 ? 'var(--viz-good)' : score >= 45 ? 'var(--viz-4)' : 'var(--viz-bad)'

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} role="img" className="shrink-0 -rotate-90">
        <circle
          cx={radius}
          cy={radius}
          r={(radius + inner) / 2}
          fill="none"
          stroke="var(--viz-seq-1)"
          strokeWidth={thickness}
        />
        <circle
          cx={radius}
          cy={radius}
          r={(radius + inner) / 2}
          fill="none"
          stroke={tone}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
        />
        <text
          x={radius}
          y={radius - 2}
          textAnchor="middle"
          className="fill-[var(--ink)] text-[44px] [font-family:var(--font-display)]"
          transform={`rotate(90 ${radius} ${radius})`}
        >
          {Math.round(score)}
        </text>
        <text
          x={radius}
          y={radius + 16}
          textAnchor="middle"
          className="fill-[var(--viz-muted)] text-[10px]"
          transform={`rotate(90 ${radius} ${radius})`}
        >
          из 100
        </text>
      </svg>

      <ul className="min-w-0 flex-1 space-y-2">
        {factors.map((factor) => (
          <li key={factor.key}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
              <span className="truncate text-ink">{factor.label}</span>
              <span className="shrink-0 text-muted [font-variant-numeric:tabular-nums]">
                {Math.round(factor.score)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-[3px] bg-[var(--sunken)]">
              <div
                className="h-full rounded-[3px]"
                style={{
                  width: `${Math.max(2, Math.min(100, factor.score))}%`,
                  background:
                    factor.score >= 70 ? 'var(--viz-good)' : factor.score >= 45 ? 'var(--viz-4)' : 'var(--viz-bad)',
                }}
              />
            </div>
            <p className="mt-0.5 truncate text-[11.5px] text-faint" title={factor.detail}>
              {factor.detail}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- гистограмма распределения ---------- */

export function Histogram({
  values,
  bins = 12,
  formatBin,
  height = 170,
  color = 'var(--viz-1)',
}: {
  values: number[]
  bins?: number
  formatBin?: (value: number) => string
  height?: number
  color?: string
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  if (values.length === 0) {
    return <p className="text-[13px] text-muted">Недостаточно данных</p>
  }

  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const step = span / bins

  const counts = new Array(bins).fill(0) as number[]
  for (const value of values) {
    const index = Math.min(bins - 1, Math.floor((value - min) / step))
    counts[index] += 1
  }
  const peak = Math.max(1, ...counts)

  const gutter = 30
  const plotW = Math.max(0, width - gutter - 8)
  const plotH = height - AXIS_BAND - PAD_TOP
  const band = plotW / bins
  const barW = Math.min(24, band * 0.78)

  return (
    <div ref={ref} className="relative">
      {width > 0 ? (
        <svg width={width} height={height} role="img">
          {niceTicks(peak, 3).map((tick) => (
            <g key={tick}>
              <line
                x1={gutter}
                x2={gutter + plotW}
                y1={PAD_TOP + plotH - (tick / peak) * plotH}
                y2={PAD_TOP + plotH - (tick / peak) * plotH}
                stroke="var(--viz-grid)"
                strokeWidth={1}
              />
              <text
                x={gutter - 6}
                y={PAD_TOP + plotH - (tick / peak) * plotH + 3.5}
                textAnchor="end"
                className="fill-[var(--viz-muted)] text-[10px] [font-variant-numeric:tabular-nums]"
              >
                {tick}
              </text>
            </g>
          ))}

          {counts.map((count, index) => {
            const h = (count / peak) * plotH
            const x = gutter + index * band + (band - barW) / 2
            return (
              <g key={index}>
                <rect x={gutter + index * band} y={PAD_TOP} width={band} height={plotH} fill="transparent" />
                <path
                  d={columnPath(x, PAD_TOP + plotH - h, barW, h)}
                  fill={color}
                  onMouseEnter={(event) => {
                    const rect = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                    const from = min + index * step
                    const to = from + step
                    setTooltip({
                      x: x + barW / 2,
                      y: event.clientY - rect.top,
                      content: `${formatBin ? formatBin(from) : from.toFixed(0)} — ${formatBin ? formatBin(to) : to.toFixed(0)}: ${count}`,
                    })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              </g>
            )
          })}

          {[0, Math.floor(bins / 2), bins - 1].map((index) => (
            <text
              key={index}
              x={gutter + index * band + band / 2}
              y={height - 6}
              textAnchor="middle"
              className="fill-[var(--viz-muted)] text-[10px]"
            >
              {formatBin ? formatBin(min + index * step) : (min + index * step).toFixed(0)}
            </text>
          ))}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      <Tooltip state={tooltip} width={width} />
    </div>
  )
}

/* ---------- прогноз с коридором ---------- */

export function ForecastChart({
  points,
  height = 200,
}: {
  points: { label: string; value: number | null; predicted: number | null; low: number | null; high: number | null }[]
  height?: number
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  const all = points.flatMap((point) => [point.value, point.high, point.predicted].filter((v): v is number => v !== null))
  const max = Math.max(1, ...all)
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1] || 1

  const gutter = 34
  const plotW = Math.max(0, width - gutter - 8)
  const plotH = height - AXIS_BAND - PAD_TOP
  const stepX = points.length > 1 ? plotW / (points.length - 1) : 0
  const xAt = (i: number) => gutter + i * stepX
  const yAt = (value: number) => PAD_TOP + plotH - (value / top) * plotH

  const bandPath = (() => {
    const withBand = points.map((point, index) => ({ point, index })).filter((entry) => entry.point.high !== null)
    if (withBand.length < 2) return ''
    const upper = withBand.map((entry) => `${xAt(entry.index)},${yAt(entry.point.high as number)}`)
    const lower = [...withBand].reverse().map((entry) => `${xAt(entry.index)},${yAt(entry.point.low as number)}`)
    return `M${upper.join(' L')} L${lower.join(' L')} Z`
  })()

  const factPath = points
    .map((point, index) => (point.value === null ? null : `${xAt(index)},${yAt(point.value)}`))
    .filter(Boolean)
    .map((coord, index) => `${index === 0 ? 'M' : 'L'}${coord}`)
    .join(' ')

  const predictedPath = points
    .map((point, index) => (point.predicted === null ? null : `${xAt(index)},${yAt(point.predicted)}`))
    .filter(Boolean)
    .map((coord, index) => `${index === 0 ? 'M' : 'L'}${coord}`)
    .join(' ')

  return (
    <div ref={ref} className="relative">
      {width > 0 ? (
        <svg
          width={width}
          height={height}
          role="img"
          onMouseMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            const index = Math.max(0, Math.min(points.length - 1, Math.round((event.clientX - rect.left - gutter) / stepX)))
            const point = points[index]
            setTooltip({
              x: xAt(index),
              y: event.clientY - rect.top,
              content:
                point.value !== null
                  ? `${point.label}: ${point.value}`
                  : `${point.label}: прогноз ~${Math.round(point.predicted ?? 0)} (${Math.round(point.low ?? 0)}–${Math.round(point.high ?? 0)})`,
            })
          }}
          onMouseLeave={() => setTooltip(null)}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={gutter} x2={gutter + plotW} y1={yAt(tick)} y2={yAt(tick)} stroke="var(--viz-grid)" strokeWidth={1} />
              <text x={gutter - 6} y={yAt(tick) + 3.5} textAnchor="end" className="fill-[var(--viz-muted)] text-[10px] [font-variant-numeric:tabular-nums]">
                {formatCompact(tick)}
              </text>
            </g>
          ))}

          {bandPath ? <path d={bandPath} fill="var(--viz-2)" opacity={0.12} /> : null}
          {predictedPath ? (
            <path d={predictedPath} fill="none" stroke="var(--viz-2)" strokeWidth={2} strokeLinecap="round" />
          ) : null}
          {factPath ? <path d={factPath} fill="none" stroke="var(--viz-1)" strokeWidth={2} strokeLinecap="round" /> : null}

          {points.map((point, index) =>
            index % Math.ceil(points.length / 7 || 1) === 0 ? (
              <text key={index} x={xAt(index)} y={height - 6} textAnchor="middle" className="fill-[var(--viz-muted)] text-[10px]">
                {point.label}
              </text>
            ) : null,
          )}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      <Tooltip state={tooltip} width={width} />
    </div>
  )
}

/* ---------- сетка когорт удержания ---------- */

export function CohortGrid({
  rows,
  months = 12,
}: {
  rows: { cohort: string; size: number; cells: (number | null)[] }[]
  months?: number
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const { ref, width } = useMeasure<HTMLDivElement>()

  const step = (value: number | null) => {
    if (value === null) return 'transparent'
    if (value === 0) return 'var(--viz-seq-0)'
    if (value <= 20) return 'var(--viz-seq-1)'
    if (value <= 40) return 'var(--viz-seq-2)'
    if (value <= 60) return 'var(--viz-seq-3)'
    if (value <= 75) return 'var(--viz-seq-4)'
    if (value <= 90) return 'var(--viz-seq-5)'
    return 'var(--viz-seq-6)'
  }

  return (
    <div ref={ref} className="relative">
      <div className="scroll-thin overflow-x-auto">
        <div className="min-w-[520px]">
          <div className="mb-1 flex gap-1 pl-[104px] text-[10px] text-muted">
            {Array.from({ length: months }, (_, index) => (
              <span key={index} className="flex-1 text-center">
                +{index}
              </span>
            ))}
          </div>
          <div className="space-y-1">
            {rows.map((row) => (
              <div key={row.cohort} className="flex items-center gap-1">
                <span className="w-[64px] shrink-0 text-[11.5px] text-ink [font-variant-numeric:tabular-nums]">
                  {row.cohort}
                </span>
                <span className="w-[36px] shrink-0 text-right text-[11.5px] text-muted [font-variant-numeric:tabular-nums]">
                  {row.size}
                </span>
                {row.cells.slice(0, months).map((cell, index) => (
                  <div
                    key={index}
                    className="h-7 flex-1 rounded-[5px]"
                    style={{ background: step(cell) }}
                    onMouseEnter={(event) => {
                      if (cell === null) return
                      const parent = event.currentTarget.closest('.relative') as HTMLElement | null
                      const rect = event.currentTarget.getBoundingClientRect()
                      const parentRect = parent?.getBoundingClientRect()
                      setTooltip({
                        x: rect.left - (parentRect?.left ?? 0),
                        y: rect.top - (parentRect?.top ?? 0),
                        content: `${row.cohort}, +${index} мес: ${cell.toFixed(0)}% из ${row.size}`,
                      })
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Tooltip state={tooltip} width={width} />
    </div>
  )
}

/* ---------- граф связей ---------- */

export function NetworkGraph({
  nodes,
  edges,
  height = 300,
  onSelect,
}: {
  nodes: { handle: string; value: number }[]
  edges: { source: string; target: string; weight: number }[]
  height?: number
  onSelect?: (handle: string) => void
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [hover, setHover] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  if (nodes.length === 0) {
    return <p className="text-[13px] text-muted">Недостаточно данных для графа</p>
  }

  // Раскладка по кругу: детерминированная и читаемая, в отличие от
  // силовой — та на каждом рендере даёт новую картинку.
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) / 2 - 46
  const positions = new Map(
    nodes.map((node, index) => {
      const angle = (index / nodes.length) * Math.PI * 2 - Math.PI / 2
      return [node.handle, { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius }]
    }),
  )

  const maxWeight = Math.max(1, ...edges.map((edge) => edge.weight))
  const maxValue = Math.max(1, ...nodes.map((node) => node.value))

  return (
    <div ref={ref} className="relative">
      {width > 0 ? (
        <svg width={width} height={height} role="img">
          {edges.map((edge) => {
            const a = positions.get(edge.source)
            const b = positions.get(edge.target)
            if (!a || !b) return null
            const active = hover === null || hover === edge.source || hover === edge.target
            return (
              <line
                key={`${edge.source}|${edge.target}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--viz-1)"
                strokeWidth={1 + (edge.weight / maxWeight) * 3}
                opacity={active ? 0.35 : 0.07}
              />
            )
          })}

          {nodes.map((node) => {
            const position = positions.get(node.handle)!
            const r = 6 + (node.value / maxValue) * 12
            const active = hover === null || hover === node.handle
            return (
              <g
                key={node.handle}
                opacity={active ? 1 : 0.3}
                className={onSelect ? 'cursor-pointer' : undefined}
                onMouseEnter={(event) => {
                  const rect = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                  setHover(node.handle)
                  const links = edges.filter((edge) => edge.source === node.handle || edge.target === node.handle)
                  setTooltip({
                    x: position.x,
                    y: event.clientY - rect.top,
                    content: `${node.handle} · ${node.value} событий · связей: ${links.length}`,
                  })
                }}
                onMouseLeave={() => {
                  setHover(null)
                  setTooltip(null)
                }}
                onClick={() => onSelect?.(node.handle)}
              >
                <circle cx={position.x} cy={position.y} r={r} fill="var(--viz-1)" stroke="var(--viz-surface)" strokeWidth={2} />
                <text
                  x={position.x}
                  y={position.y + r + 12}
                  textAnchor="middle"
                  className="fill-[var(--ink)] text-[10px]"
                >
                  {node.handle.length > 12 ? `${node.handle.slice(0, 11)}…` : node.handle}
                </text>
              </g>
            )
          })}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      <Tooltip state={tooltip} width={width} />
    </div>
  )
}

/* ---------- воронка стадий ---------- */

export function StageFunnel({
  stages,
}: {
  stages: { label: string; value: number; color: string }[]
}) {
  const total = stages.reduce((sum, stage) => sum + stage.value, 0)
  return (
    <div className="space-y-2">
      {stages.map((stage) => (
        <div key={stage.label}>
          <div className="mb-1 flex items-baseline justify-between text-[13px]">
            <span className="flex items-center gap-1.5 text-ink">
              <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: stage.color }} />
              {stage.label}
            </span>
            <span className="text-muted [font-variant-numeric:tabular-nums]">
              {stage.value} · {total > 0 ? Math.round((stage.value / total) * 100) : 0}%
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-[4px] bg-[var(--sunken)]">
            <div
              className="h-full rounded-[4px]"
              style={{
                width: stage.value > 0 && total > 0 ? `${Math.max(2, (stage.value / total) * 100)}%` : '0%',
                background: stage.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
