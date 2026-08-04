import type { Meta, StoryObj } from '@storybook/react-vite'
import { Select } from './Field'

const meta = {
  title: 'Компоненты/Select',
  component: Select,
  tags: ['autodocs'],
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <div style={{ width: 240 }}>
      <Select {...args}>
        <option>Не повторяется</option>
        <option>Каждый день</option>
        <option>Каждую неделю</option>
        <option>Каждый месяц</option>
      </Select>
    </div>
  ),
}
