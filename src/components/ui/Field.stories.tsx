import type { Meta, StoryObj } from '@storybook/react-vite'
import { Field, Input } from './Field'

const meta = {
  title: 'Компоненты/Field',
  component: Field,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Обёртка с лейблом и подсказкой для любого поля ввода.',
      },
    },
  },
  args: {
    label: 'Название события',
    hint: 'Видно всем участникам',
    children: <Input placeholder="Например, Синк по продукту" />,
  },
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <div style={{ width: 320 }}>
      <Field {...args} />
    </div>
  ),
}
