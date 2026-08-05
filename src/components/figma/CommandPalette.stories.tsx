import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@/components/ui'
import { CommandPalette, type Command } from './CommandPalette'

const COMMANDS: Command[] = [
  { id: 's1', group: 'Разделы', label: 'Инсайты', hint: 'Обзор', icon: 'Bell', run: () => {} },
  { id: 's2', group: 'Разделы', label: 'Дашборд', hint: 'Обзор', icon: 'AlignLeft', run: () => {} },
  { id: 's3', group: 'Разделы', label: 'Тренды', hint: 'Обзор', icon: 'ArrowRight', run: () => {} },
  { id: 's4', group: 'Разделы', label: 'Люди', hint: 'Разрезы', icon: 'Users', run: () => {} },
  { id: 'a1', group: 'Действия', label: 'Синхронизировать пространство', icon: 'RefreshCw', run: () => {} },
  { id: 'f1', group: 'Файлы', label: '💎 Profile', hint: 'JetTon - Product', icon: 'CalendarDays', run: () => {} },
  { id: 'f2', group: 'Файлы', label: 'Design System Core', hint: 'Foundation - Core', icon: 'CalendarDays', run: () => {} },
  { id: 'p1', group: 'Участники', label: 'tugai', hint: '367 событий', avatar: '', run: () => {} },
  { id: 'p2', group: 'Участники', label: 'Elena', hint: '365 событий', avatar: '', run: () => {} },
]

/** Быстрый переход по разделам, файлам и участникам. Открывается на ⌘K,
 * управляется стрелками и Enter, закрывается на Escape. */
const meta = {
  title: 'Figma/Командная палитра',
  component: CommandPalette,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CommandPalette>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: { open: true, onClose: () => {}, commands: COMMANDS },
  render: (args) => {
    const [open, setOpen] = useState(true)
    return (
      <div style={{ height: '100vh', padding: 24 }}>
        <Button onClick={() => setOpen(true)}>Открыть палитру (⌘K)</Button>
        <CommandPalette {...args} open={open} onClose={() => setOpen(false)} />
      </div>
    )
  },
}
