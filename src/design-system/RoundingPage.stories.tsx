import type { Meta, StoryObj } from '@storybook/react-vite'
import { RoundingPage } from './RoundingPage'

const meta = {
  title: 'Токены/Скругления (Figma)',
  component: RoundingPage,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Figma Analytics | Tokens — коллекция Rounding, режимы плотности Low/Medium/Hight.',
      },
    },
  },
} satisfies Meta<typeof RoundingPage>

export default meta
type Story = StoryObj<typeof meta>

export const Скругления: Story = {}
