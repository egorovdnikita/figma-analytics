import { ROUNDING_DENSITIES, ROUNDING_MODE_TOKENS } from './rounding-tokens'

export function RoundingPage() {
  return (
    <div>
      <p style={{ font: '400 13px/1.6 var(--font-body)', color: 'var(--muted)', marginBottom: 20 }}>
        Figma Analytics | Tokens — коллекция <code>Rounding</code>: 11 семантических ступеней ×
        3 режима плотности (<code>Low</code>/<code>Medium</code>/<code>Hight</code> — так они
        названы в самом Figma-файле). Это отдельная шкала от собственных радиусов Figma Analytics
        (<code>--radius-chip/control/card/full</code>, см. страницу «Обзор»): показана здесь
        как есть, без переноса в приложение.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr', gap: 12, marginBottom: 8 }}>
        <span />
        {ROUNDING_DENSITIES.map((d) => (
          <span key={d} style={{ font: '600 11px/1.4 var(--font-body)', color: 'var(--faint)' }}>
            {d}
          </span>
        ))}
      </div>

      {ROUNDING_MODE_TOKENS.map((token) => (
        <div
          key={token.name}
          style={{
            display: 'grid',
            gridTemplateColumns: '160px 1fr 1fr 1fr',
            gap: 12,
            alignItems: 'center',
            padding: '8px 0',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <code style={{ font: '400 11px/1.4 monospace', color: 'var(--ink)' }}>{token.name}</code>
          {ROUNDING_DENSITIES.map((d) => {
            const px = token.byDensity[d]
            return (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 40,
                    height: 28,
                    background: 'var(--lilac-soft)',
                    border: '1px solid var(--lilac)',
                    borderRadius: px,
                  }}
                />
                <span style={{ font: '400 10px/1.3 var(--font-body)', color: 'var(--faint)' }}>{px}</span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
