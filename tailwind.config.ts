import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        raised: 'var(--raised)',
        sunken: 'var(--sunken)',
        line: 'var(--line)',
        ink: 'var(--ink)',
        muted: 'var(--muted)',
        faint: 'var(--faint)',
        grass: 'var(--grass)',
        'grass-ink': 'var(--grass-ink)',
        'grass-soft': 'var(--grass-soft)',
        lilac: 'var(--lilac)',
        'lilac-soft': 'var(--lilac-soft)',
        danger: 'var(--danger)',
      },
      borderRadius: {
        card: '24px',
        control: '16px',
        chip: '10px',
      },
      fontFamily: {
        sans: ['Inter', 'Golos Text', '-apple-system', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        pop: '0 18px 48px -16px rgb(0 0 0 / 0.28), 0 2px 8px -2px rgb(0 0 0 / 0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config
