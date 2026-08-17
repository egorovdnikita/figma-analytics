import { BRAND_COLOR_TOKENS, STATIC_COLOR_TOKENS, type BrandMode } from './brand-color-tokens'

function Swatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <span style={{ width: 22, height: 22, borderRadius: 5, background: hex, border: '1px solid var(--line)', flexShrink: 0 }} />
      <code style={{ font: '400 11px/1.4 monospace', color: 'var(--ink)' }}>{name}</code>
      <span style={{ font: '400 10px/1.3 var(--font-body)', color: 'var(--faint)', marginLeft: 'auto' }}>{hex}</span>
    </div>
  )
}

export function BrandColorPage({ mode }: { mode: BrandMode }) {
  return (
    <div>
      <p style={{ font: '400 13px/1.6 var(--font-body)', color: 'var(--muted)', marginBottom: 20 }}>
        Figma Analytics | Tokens — коллекция <code>Color</code>: 10 hue-режимов (переключатель выбора
        акцентного цвета продукта). Реально по режиму меняются только 5 токенов пространства{' '}
        <code>colors/brand/*</code> — Figma Analytics использует режим <code>Violet</code>, он совпадает
        с <code>--grass</code> в <code>src/index.css</code>. Остальные 38 токенов ниже
        (neutral/informative/positive/warning/negative/white/black) не зависят от режима.
      </p>

      <h3 style={{ font: '700 14px/1.4 var(--font-body)', color: 'var(--ink)', marginBottom: 8 }}>
        colors/brand/* — режим {mode}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '4px 24px', marginBottom: 28 }}>
        {BRAND_COLOR_TOKENS.map((t) => (
          <Swatch key={t.name} name={t.name} hex={t.byMode[mode]} />
        ))}
      </div>

      <h3 style={{ font: '700 14px/1.4 var(--font-body)', color: 'var(--ink)', marginBottom: 8 }}>
        Инвариантные токены (не зависят от режима)
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '4px 24px' }}>
        {STATIC_COLOR_TOKENS.map((t) => (
          <Swatch key={t.name} name={t.name} hex={t.hex} />
        ))}
      </div>
    </div>
  )
}
