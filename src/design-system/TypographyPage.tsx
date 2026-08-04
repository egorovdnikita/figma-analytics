import { FONT_STACKS } from '@/lib/fonts'
import type { FontVariant } from '@/types'
import { TYPE_SCALE, TYPE_WEIGHTS, type FontFamilyMode } from './typography-scale-tokens'

const MODE_TO_FONT_VARIANT: Record<FontFamilyMode, FontVariant> = {
  Inter: 'inter',
  'Inter Display': 'inter-display',
  'Inter Tight': 'inter-tight',
  'Inter Variable': 'inter-variable',
}

export function TypographyPage({ mode }: { mode: FontFamilyMode }) {
  const fontFamily = FONT_STACKS[MODE_TO_FONT_VARIANT[mode]]
  return (
    <div style={{ ['--ds-font' as string]: fontFamily }}>
      <p style={{ font: '400 13px/1.6 var(--font-body)', color: 'var(--muted)', marginBottom: 20 }}>
        Box UI | Tokens — коллекция <code>Typography</code> (4 режима шрифта: Inter, Inter
        Display, Inter Tight, Inter Variable — числовая шкала одна и та же, режим меняет
        только <code>font-family</code>) + коллекция <code>Grid</code> (брейкпоинты
        Desktop/Mobile — переопределяют размеры display/heading, body и caption не меняются).
        Font-weight: medium {TYPE_WEIGHTS.medium}, semibold {TYPE_WEIGHTS.semibold}. Переключите
        режим шрифта через Controls. Настоящий рендер: «Inter Display» в проекте не
        распространяется отдельным файлом — используется вариативный Inter (см.{' '}
        <code>src/lib/fonts.ts</code>).
      </p>

      {TYPE_SCALE.map((step) => {
        const isResponsive =
          step.desktop.fontSize !== step.mobile.fontSize || step.desktop.lineHeight !== step.mobile.lineHeight
        return (
          <div
            key={step.name}
            style={{ display: 'flex', alignItems: 'baseline', gap: 16, borderBottom: '1px solid var(--line)', padding: '10px 0' }}
          >
            <code style={{ width: 90, flexShrink: 0, font: '400 11px/1.4 monospace', color: 'var(--muted)' }}>
              {step.name}
            </code>
            <span
              style={{
                fontFamily: 'var(--ds-font)',
                fontWeight: 600,
                fontSize: step.desktop.fontSize,
                lineHeight: `${step.desktop.lineHeight}px`,
                letterSpacing: step.desktop.letterSpacing,
                color: 'var(--ink)',
                flex: 1,
              }}
            >
              Box UI
            </span>
            <span style={{ width: 200, flexShrink: 0, font: '400 11px/1.4 var(--font-body)', color: 'var(--faint)', textAlign: 'right' }}>
              {step.desktop.fontSize}/{step.desktop.lineHeight}/{step.desktop.letterSpacing}
              {isResponsive && (
                <>
                  {' '}
                  <span style={{ color: 'var(--muted)' }}>
                    · mobile {step.mobile.fontSize}/{step.mobile.lineHeight}
                  </span>
                </>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
