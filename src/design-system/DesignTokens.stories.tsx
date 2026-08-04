import type { Meta, StoryObj } from '@storybook/react-vite'
import { DesignTokensPage } from './DesignTokens'

const meta = {
  title: 'Токены/Обзор',
  component: DesignTokensPage,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Все токены живут как CSS-переменные в `src/index.css` (светлая тема — `:root`, тёмная — `.dark`) ' +
          'и прокинуты в Tailwind через `tailwind.config.ts`. Переключите тему через тумблер в тулбаре сверху.',
      },
    },
  },
} satisfies Meta<typeof DesignTokensPage>

export default meta
type Story = StoryObj<typeof meta>

export const Обзор: Story = {}
