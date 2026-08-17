import { PRIMITIVE_BLACK_WHITE, PRIMITIVE_HUES } from './primitives'

function Swatch({ hex, step }: { hex: string; step: string }) {
  return (
    <div
      title={`${step} — ${hex}`}
      style={{
        flex: 1,
        minWidth: 20,
        height: 40,
        background: hex,
        border: '1px solid var(--line)',
      }}
    />
  )
}

function HueRow({ name, solid, alpha }: { name: string; solid: typeof PRIMITIVE_HUES[number]['solid']; alpha: typeof PRIMITIVE_HUES[number]['alpha'] }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          font: '600 12px/1.4 var(--font-body)',
          color: 'var(--ink)',
          marginBottom: 4,
          textTransform: 'capitalize',
        }}
      >
        {name}
      </div>
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden' }}>
        {solid.map((s) => (
          <Swatch key={s.step} hex={s.hex} step={`solid/${s.step}`} />
        ))}
      </div>
      <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', marginTop: 2 }}>
        {alpha.map((s) => (
          <Swatch key={s.step} hex={s.hex} step={`alpha/${s.step}`} />
        ))}
      </div>
    </div>
  )
}

export function PalettePage() {
  return (
    <div style={{ ['--font-body' as string]: "Inter Variable, sans-serif" }}>
      <p style={{ font: '400 13px/1.6 var(--font-body)', color: 'var(--muted)', marginBottom: 20 }}>
        Figma Analytics | Primitives — коллекция <code>Color Palette</code>: 18 оттенков × 19 ступеней
        solid (50–950) + 12 ступеней alpha, плюс отдельные alpha-рамки чёрного и белого.
        Наведите на свотч, чтобы увидеть шаг и hex. Это сырые примитивы — компоненты их
        напрямую не используют, только через семантические токены (см. «Семантика (Figma)»).
      </p>
      {PRIMITIVE_HUES.map((hue) => (
        <HueRow key={hue.name} name={hue.name} solid={hue.solid} alpha={hue.alpha} />
      ))}

      <div style={{ marginTop: 24 }}>
        <div style={{ font: '600 12px/1.4 var(--font-body)', color: 'var(--ink)', marginBottom: 4 }}>
          alpha / black
        </div>
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
          {PRIMITIVE_BLACK_WHITE.black.map((s) => (
            <Swatch key={s.step} hex={s.hex} step={`black/${s.step}`} />
          ))}
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <div style={{ font: '600 12px/1.4 var(--font-body)', color: 'var(--ink)', marginBottom: 4 }}>
          alpha / white
        </div>
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', background: '#171717' }}>
          {PRIMITIVE_BLACK_WHITE.white.map((s) => (
            <Swatch key={s.step} hex={s.hex} step={`white/${s.step}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
