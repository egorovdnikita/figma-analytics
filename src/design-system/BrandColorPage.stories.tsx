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
        component: 'Brand ・ Color дизайн-системы box-ui: моды Deep, Bright, Monochrome. Приложение использует Deep.',
      },
    },
  },
  argTypes: {
    mode: { control: 'select', options: BRAND_MODES },
  },
  args: {
    mode: 'Deep',
  },
} satisfies Meta<typeof BrandColorPage>

export default meta
type Story = StoryObj<typeof meta>

export const ЦветБренда: Story = {}
