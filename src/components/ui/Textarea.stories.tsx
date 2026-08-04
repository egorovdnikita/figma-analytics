import type { Meta, StoryObj } from '@storybook/react-vite'
import { Textarea } from './Field'

const meta = {
  title: 'Компоненты/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  args: {
    placeholder: 'Описание события',
    rows: 4,
  },
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <div style={{ width: 320 }}>
      <Textarea {...args} />
    </div>
  ),
}
