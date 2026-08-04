import { AppIcon, ICON_NAMES, IconStyleProvider } from '@/components/AppIcon'
import type { IconStyle } from '@/types'

export function IconsPage({ style }: { style: IconStyle }) {
  return (
    <IconStyleProvider style={style}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 12,
        }}
      >
        {ICON_NAMES.map((name) => (
          <div
            key={name}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              padding: 16,
              borderRadius: 14,
              background: 'var(--surface)',
              border: '1px solid var(--line)',
            }}
          >
            <AppIcon name={name} size={24} className="text-ink" />
            <span style={{ font: '400 11px/1.3 var(--font-body)', color: 'var(--muted)' }}>
              {name}
            </span>
          </div>
        ))}
      </div>
    </IconStyleProvider>
  )
}
