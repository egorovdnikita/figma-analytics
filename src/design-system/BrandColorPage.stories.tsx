import type { Meta, StoryObj } from '@storybook/react-vite'
import { BrandColorPage } from './BrandColorPage'
import { BRAND_MODES } from './brand-color-tokens'

const meta = {
  title: 'Токены/Цвет бренда (Figma)',
  component: BrandColorPage,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Box UI | Tokens — коллекция Color, 10 hue-режимов. Box UI использует Violet.',
      },
    },
  },
  argTypes: {
    mode: { control: 'select', options: BRAND_MODES },
  },
  args: {
    mode: 'Violet',
  },
} satisfies Meta<typeof BrandColorPage>

export default meta
type Story = StoryObj<typeof meta>

export const ЦветБренда: Story = {}
