import type { Meta, StoryObj } from '@storybook/react-vite'
import { AppIcon } from '@/components/AppIcon'
import { IconButton } from './Button'

const meta = {
  title: 'Компоненты/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Круглая кнопка-иконка. `label` обязателен — это `aria-label` и `title`.',
      },
    },
  },
  args: {
    label: 'Обновить',
    children: <AppIcon name="RefreshCw" size={17} />,
  },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Active: Story = {
  args: { active: true },
}
