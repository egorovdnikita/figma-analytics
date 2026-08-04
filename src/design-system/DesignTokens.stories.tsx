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
          'Прикладные токены, реально используемые в Box UI: CSS-переменные из `src/index.css` ' +
          '(светлая тема — `:root`, тёмная — `.dark`), прокинутые в Tailwind через `tailwind.config.ts`. ' +
          'Это подмножество Figma-переменных, адаптированное под приложение (например, свой упрощённый ' +
          'radius на 4 значения вместо 11×3 у Figma, свой type scale вместо 12 семантических шагов). ' +
          'Полный набор токенов из Figma Variables — на страницах «Палитра», «Примитивы (шкалы)», ' +
          '«Семантика (Figma)», «Цвет бренда (Figma)», «Скругления (Figma)» и «Типографика (Figma)». ' +
          'Переключите тему через тумблер в тулбаре сверху.',
      },
    },
  },
} satisfies Meta<typeof DesignTokensPage>

export default meta
type Story = StoryObj<typeof meta>

export const Обзор: Story = {}
