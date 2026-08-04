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
