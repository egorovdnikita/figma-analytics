import { colorTokens, radiusTokens, shadowTokens, typeScale, fontFamily } from './tokens'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ font: '700 20px/1.3 var(--ds-font)', color: 'var(--ink)', marginBottom: 16 }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

export function ColorTokens() {
  return (
    <Section title="Цвета">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 12,
        }}
      >
        {colorTokens.map((token) => (
          <div
            key={token.name}
            style={{
              border: '1px solid var(--line)',
              borderRadius: 14,
              overflow: 'hidden',
              background: 'var(--surface)',
            }}
          >
            <div style={{ display: 'flex', height: 56 }}>
              <div style={{ flex: 1, background: token.light }} title={`light: ${token.light}`} />
              <div style={{ flex: 1, background: token.dark }} title={`dark: ${token.dark}`} />
            </div>
            <div style={{ padding: '10px 12px' }}>
              <div style={{ font: '600 13px/1.3 var(--ds-font)', color: 'var(--ink)' }}>
                {token.name}
              </div>
              <div style={{ font: '400 11px/1.4 var(--ds-font)', color: 'var(--muted)', marginTop: 2 }}>
                var({token.cssVar})
              </div>
              <div style={{ font: '400 12px/1.4 var(--ds-font)', color: 'var(--muted)', marginTop: 6 }}>
                {token.description}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  font: '500 11px/1.4 var(--ds-font)',
                  color: 'var(--faint)',
                  marginTop: 6,
                }}
              >
                <span>{token.light}</span>
                <span>{token.dark}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

export function RadiusTokens() {
  return (
    <Section title="Скругления">
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {radiusTokens.map((token) => (
          <div key={token.name} style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 96,
                height: 96,
                background: 'var(--grass-soft)',
                border: '1px solid var(--line)',
                borderRadius: token.value,
              }}
            />
            <div style={{ font: '600 12px/1.4 var(--ds-font)', color: 'var(--ink)', marginTop: 8 }}>
              {token.name} — {token.value}
            </div>
            <div style={{ font: '400 11px/1.4 var(--ds-font)', color: 'var(--muted)' }}>
              .{token.className}
            </div>
            <div style={{ font: '400 11px/1.4 var(--ds-font)', color: 'var(--muted)', maxWidth: 120 }}>
              {token.description}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

export function ShadowTokens() {
  return (
    <Section title="Тени">
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {shadowTokens.map((token) => (
          <div key={token.name} style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 140,
                height: 90,
                background: 'var(--surface)',
                borderRadius: 20,
                boxShadow: token.value,
                display: 'grid',
                placeItems: 'center',
                font: '600 12px/1.4 var(--ds-font)',
                color: 'var(--ink)',
              }}
            >
              {token.name}
            </div>
            <div style={{ font: '400 11px/1.4 var(--ds-font)', color: 'var(--muted)', marginTop: 8 }}>
              .{token.className} — {token.description}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

export function TypeScaleTokens() {
  return (
    <Section title="Типографика">
      <div style={{ font: '400 12px/1.5 var(--ds-font)', color: 'var(--muted)', marginBottom: 12 }}>
        Шрифт: Onest Variable · вес text-[Npx] задаётся произвольным значением Tailwind
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {typeScale.map((row) => (
          <div
            key={row.size}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 16,
              borderBottom: '1px solid var(--line)',
              paddingBottom: 10,
            }}
          >
            <span
              style={{
                width: 48,
                flexShrink: 0,
                font: '500 12px/1.4 var(--ds-font)',
                color: 'var(--muted)',
              }}
            >
              {row.size}px
            </span>
            <span
              style={{
                fontFamily,
                fontWeight: 700,
                fontSize: row.size,
                color: 'var(--ink)',
                lineHeight: 1.2,
              }}
            >
              Box UI
            </span>
            <span style={{ font: '400 12px/1.4 var(--ds-font)', color: 'var(--muted)' }}>
              {row.usage}
            </span>
          </div>
        ))}
      </div>
    </Section>
  )
}

export function DesignTokensPage() {
  return (
    <div style={{ ['--ds-font' as string]: fontFamily }}>
      <ColorTokens />
      <RadiusTokens />
      <ShadowTokens />
      <TypeScaleTokens />
    </div>
  )
}
