import type { Meta, StoryObj } from '@storybook/react-vite'
import { SemanticTokensPage } from './SemanticTokensPage'

const meta = {
  title: 'Токены/Семантика (Figma)',
  component: SemanticTokensPage,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Box UI | Tokens — коллекция Mode (Light/Dark) в точности как в Figma.',
      },
    },
  },
} satisfies Meta<typeof SemanticTokensPage>

export default meta
type Story = StoryObj<typeof meta>

export const Семантика: Story = {}
