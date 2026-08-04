import type { Meta, StoryObj } from '@storybook/react-vite'
import { AppIcon } from '@/components/AppIcon'
import { Button, BUTTON_SIZES, BUTTON_VARIANTS } from './Button'

const meta = {
  title: 'Компоненты/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Основная кнопка приложения. Пять смысловых вариантов, три размера.',
      },
    },
  },
  argTypes: {
    variant: { control: 'select', options: BUTTON_VARIANTS },
    size: { control: 'select', options: BUTTON_SIZES },
  },
  args: {
    children: 'Создать событие',
    variant: 'primary',
    size: 'md',
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const ВсеВарианты: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {BUTTON_VARIANTS.map((variant) => (
        <div key={variant} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 72, fontSize: 12, color: 'var(--muted)' }}>{variant}</span>
          {BUTTON_SIZES.map((size) => (
            <Button key={size} variant={variant} size={size}>
              Кнопка
            </Button>
          ))}
        </div>
      ))}
    </div>
  ),
}

export const СИконкой: Story = {
  args: {
    children: (
      <>
        <AppIcon name="Plus" size={18} />
        Создать событие
      </>
    ),
  },
}

export const Disabled: Story = {
  args: { disabled: true },
}
