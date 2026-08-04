import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Segmented } from './Segmented'

const VIEWS = [
  { value: 'day', label: 'день' },
  { value: 'week', label: 'неделя' },
  { value: 'month', label: 'месяц' },
  { value: 'agenda', label: 'список' },
] as const

const meta = {
  title: 'Компоненты/Segmented',
  component: Segmented,
  tags: ['autodocs'],
  args: {
    options: VIEWS as unknown as { value: string; label: string }[],
    value: 'week',
    onChange: () => {},
  },
} satisfies Meta<typeof Segmented>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => {
    const [value, setValue] = useState(args.value)
    return (
      <div style={{ background: 'var(--sunken)', borderRadius: 999, display: 'inline-flex' }}>
        <Segmented {...args} value={value} onChange={setValue} />
      </div>
    )
  },
}
