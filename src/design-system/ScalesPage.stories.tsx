import type { Meta, StoryObj } from '@storybook/react-vite'
import { ScalesPage } from './ScalesPage'

const meta = {
  title: 'Токены/Примитивы (шкалы)',
  component: ScalesPage,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Figma Analytics | Primitives — Spacing, Rounding, Size, Opacity, Typography.',
      },
    },
  },
} satisfies Meta<typeof ScalesPage>

export default meta
type Story = StoryObj<typeof meta>

export const Примитивы: Story = {}
