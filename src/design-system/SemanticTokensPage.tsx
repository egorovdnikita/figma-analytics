import { SEMANTIC_GROUPS } from './semantic-tokens'

function Row({
  name,
  light,
  dark,
  lightPrimitive,
  darkPrimitive,
}: {
  name: string
  light: string
  dark: string
  lightPrimitive: string
  darkPrimitive: string
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 90px 90px',
        alignItems: 'center',
        gap: 12,
        padding: '6px 0',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <code style={{ font: '400 12px/1.4 monospace', color: 'var(--ink)' }}>{name}</code>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            background: light,
            border: '1px solid var(--line)',
            flexShrink: 0,
          }}
          title={lightPrimitive}
        />
        <span style={{ font: '400 10px/1.3 var(--font-body)', color: 'var(--faint)' }}>{light}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            background: dark,
            border: '1px solid var(--line)',
            flexShrink: 0,
          }}
          title={darkPrimitive}
        />
        <span style={{ font: '400 10px/1.3 var(--font-body)', color: 'var(--faint)' }}>{dark}</span>
      </div>
    </div>
  )
}

export function SemanticTokensPage() {
  return (
    <div>
      <p style={{ font: '400 13px/1.6 var(--font-body)', color: 'var(--muted)', marginBottom: 16 }}>
        Box UI | Tokens — коллекция <code>Mode</code> (Light/Dark), как показано в Figma:
        пять пространств имён (background, content, border, control, interactive), каждый
        токен — алиас на примитив. Значения здесь — то, что задано в самом Figma-файле
        (например, sentiment/primary там ссылается на blue), а не то, что реально используется
        в приложении — Box UI переопределяет акцент на violet через отдельную коллекцию
        «Color» (см. страницу «Обзор»).
      </p>
      {SEMANTIC_GROUPS.map((group) => (
        <div key={group.namespace} style={{ marginBottom: 24 }}>
          <h3
            style={{
              font: '700 14px/1.4 var(--font-body)',
              color: 'var(--ink)',
              marginBottom: 8,
              textTransform: 'capitalize',
            }}
          >
            {group.namespace}
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 90px 90px',
              gap: 12,
              font: '600 11px/1.4 var(--font-body)',
              color: 'var(--faint)',
              paddingBottom: 4,
            }}
          >
            <span>token</span>
            <span>light</span>
            <span>dark</span>
          </div>
          {group.tokens.map((token) => (
            <Row key={token.name} {...token} />
          ))}
        </div>
      ))}
    </div>
  )
}
