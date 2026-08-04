import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from './Field'

const meta = {
  title: 'Компоненты/Input',
  component: Input,
  tags: ['autodocs'],
  args: {
    placeholder: 'Поиск по событиям',
  },
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <div style={{ width: 280 }}>
      <Input {...args} />
    </div>
  ),
}

export const Disabled: Story = {
  args: { disabled: true, value: 'Недоступно для редактирования' },
  render: (args) => (
    <div style={{ width: 280 }}>
      <Input {...args} />
    </div>
  ),
}

export const ДатаИВремя: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8, width: 280 }}>
      <Input type="date" defaultValue="2026-08-05" />
      <Input type="time" defaultValue="14:30" style={{ width: 150 }} />
    </div>
  ),
}
