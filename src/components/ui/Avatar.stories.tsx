import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar } from './Avatar'

const meta = {
  title: 'Компоненты/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  args: {
    name: 'Никита Егоров',
    size: 36,
  },
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Размеры: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {[24, 32, 36, 48, 64].map((size) => (
        <Avatar key={size} name="Никита Егоров" size={size} />
      ))}
    </div>
  ),
}
