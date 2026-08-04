import type { Meta, StoryObj } from '@storybook/react-vite'
import { Chip } from './Chip'

const meta = {
  title: 'Компоненты/Chip',
  component: Chip,
  tags: ['autodocs'],
  argTypes: {
    tone: { control: 'select', options: ['neutral', 'grass', 'lilac'] },
  },
  args: {
    children: 'Подтверждено',
    tone: 'grass',
  },
} satisfies Meta<typeof Chip>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const ВсеТона: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <Chip tone="neutral">Нейтральный</Chip>
      <Chip tone="grass">Подтверждено</Chip>
      <Chip tone="lilac">Возможно</Chip>
    </div>
  ),
}
