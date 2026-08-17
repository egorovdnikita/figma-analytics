import type { Meta, StoryObj } from '@storybook/react-vite'
import { TypographyPage } from './TypographyPage'
import { FONT_FAMILY_MODES } from './typography-scale-tokens'

const meta = {
  title: 'Токены/Типографика (Figma)',
  component: TypographyPage,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Figma Analytics | Tokens — коллекция Typography (режимы шрифта) + Grid (Desktop/Mobile).',
      },
    },
  },
  argTypes: {
    mode: { control: 'select', options: FONT_FAMILY_MODES },
  },
  args: {
    mode: 'Inter Variable',
  },
} satisfies Meta<typeof TypographyPage>

export default meta
type Story = StoryObj<typeof meta>

export const Типографика: Story = {}
