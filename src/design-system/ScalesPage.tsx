import {
  FONT_SIZE_SCALE,
  FONT_WEIGHT_SCALE,
  LETTER_SPACING_SCALE,
  LINE_HEIGHT_SCALE,
  OPACITY_SCALE,
  PARAGRAPH_SPACING_SCALE,
  ROUNDING_SCALE,
  SIZE_SCALE,
  SPACING_SCALE,
} from './scale-tokens'

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h3 style={{ font: '700 14px/1.4 var(--font-body)', color: 'var(--ink)', marginBottom: 4 }}>{title}</h3>
      <p style={{ font: '400 12px/1.5 var(--font-body)', color: 'var(--muted)', marginBottom: 12 }}>{description}</p>
      {children}
    </section>
  )
}

function BarRow({ value, max }: { value: number; max: number }) {
  const px = typeof value === 'number' ? value : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '3px 0' }}>
      <span style={{ width: 34, flexShrink: 0, font: '500 11px/1.4 monospace', color: 'var(--muted)' }}>{value}</span>
      <div
        style={{
          height: 12,
          width: Math.max(2, (px / max) * 240),
          background: 'var(--lilac)',
          borderRadius: 2,
        }}
      />
    </div>
  )
}

function RoundingRow({ value }: { value: number | 'full' }) {
  const radius = value === 'full' ? 9999 : value
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '3px 0' }}>
      <span style={{ width: 34, flexShrink: 0, font: '500 11px/1.4 monospace', color: 'var(--muted)' }}>{value}</span>
      <div style={{ width: 40, height: 24, background: 'var(--lilac-soft)', border: '1px solid var(--lilac)', borderRadius: radius }} />
    </div>
  )
}

export function ScalesPage() {
  return (
    <div>
      <p style={{ font: '400 13px/1.6 var(--font-body)', color: 'var(--muted)', marginBottom: 24 }}>
        Box UI | Primitives — коллекции <code>Spacing</code>, <code>Rounding</code>,{' '}
        <code>Size</code>, <code>Opacity</code>, <code>Typography</code> (единственный режим Value)
        в точности как в Figma. Это сырые числовые шкалы — семантические токены (Скругления,
        Типографика) ссылаются на них по имени ступени.
      </p>

      <Section title="Spacing" description="29 значений, шаг варьируется от 2 до 4px.">
        {SPACING_SCALE.map((v) => (
          <BarRow key={v} value={v} max={96} />
        ))}
      </Section>

      <Section title="Rounding" description="31 значение: 0–96 плюс full (9999) для полного скругления.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {ROUNDING_SCALE.map((v) => (
            <RoundingRow key={String(v)} value={v} />
          ))}
        </div>
      </Section>

      <Section title="Size" description="29 значений — та же шкала, что и Spacing, для размеров иконок/контролов.">
        {SIZE_SCALE.map((v) => (
          <BarRow key={v} value={v} max={96} />
        ))}
      </Section>

      <Section title="Opacity" description="29 значений в процентах (2–96).">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {OPACITY_SCALE.map((v) => (
            <div key={v} style={{ textAlign: 'center' }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  background: `color-mix(in srgb, var(--lilac) ${v}%, transparent)`,
                  border: '1px solid var(--line)',
                }}
              />
              <div style={{ font: '400 10px/1.4 monospace', color: 'var(--faint)', marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography — font-weight" description="9 ступеней, из них Box UI/Figma-компоненты используют medium (500) и semibold (600).">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          {FONT_WEIGHT_SCALE.map((w) => (
            <div key={w.name} style={{ font: `${w.value} 15px/1.4 var(--font-body)`, color: 'var(--ink)' }}>
              {w.name} {w.value}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography — font-size" description="24 ступени, 10–96px.">
        {FONT_SIZE_SCALE.map((v) => (
          <BarRow key={v} value={v} max={96} />
        ))}
      </Section>

      <Section title="Typography — line-height" description="24 ступени, 12–96px.">
        {LINE_HEIGHT_SCALE.map((v) => (
          <BarRow key={v} value={v} max={96} />
        ))}
      </Section>

      <Section title="Typography — letter-spacing" description="11 ступеней, 0…-3px.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {LETTER_SPACING_SCALE.map((v) => (
            <span key={v} style={{ font: '400 11px/1.4 monospace', color: 'var(--muted)' }}>
              {v}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Typography — paragraph-spacing" description="7 ступеней, 0–24px.">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {PARAGRAPH_SPACING_SCALE.map((v) => (
            <span key={v} style={{ font: '400 11px/1.4 monospace', color: 'var(--muted)' }}>
              {v}
            </span>
          ))}
        </div>
      </Section>
    </div>
  )
}
