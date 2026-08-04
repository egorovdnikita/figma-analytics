import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Switch } from './Switch'

const meta = {
  title: 'Компоненты/Switch',
  component: Switch,
  tags: ['autodocs'],
  args: {
    label: 'Показывать выходные',
    checked: true,
    onChange: () => {},
  },
} satisfies Meta<typeof Switch>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(args.checked)
    return <Switch {...args} checked={checked} onChange={setChecked} />
  },
}
