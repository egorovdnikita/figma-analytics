import type { Meta, StoryObj } from '@storybook/react-vite'
import { PalettePage } from './PalettePage'

const meta = {
  title: 'Токены/Палитра',
  component: PalettePage,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Box UI | Primitives — сырая палитра, источник для всех семантических токенов.',
      },
    },
  },
} satisfies Meta<typeof PalettePage>

export default meta
type Story = StoryObj<typeof meta>

export const Палитра: Story = {}
