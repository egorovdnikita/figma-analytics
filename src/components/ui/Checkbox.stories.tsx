import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Checkbox } from './Checkbox'

const meta = {
  title: 'Компоненты/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  args: {
    label: 'Рабочий календарь',
    checked: true,
    onChange: () => {},
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(args.checked)
    return (
      <div style={{ width: 240 }}>
        <Checkbox {...args} checked={checked} onChange={() => setChecked((v) => !v)} />
      </div>
    )
  },
}

export const ССвоимЦветом: Story = {
  args: { color: '#e06666', label: 'Дни рождения' },
  render: (args) => {
    const [checked, setChecked] = useState(args.checked)
    return (
      <div style={{ width: 240 }}>
        <Checkbox {...args} checked={checked} onChange={() => setChecked((v) => !v)} />
      </div>
    )
  },
}
