import type { Meta, StoryObj } from '@storybook/react-vite'
import { IconsPage } from './IconsPage'
import { ICON_STYLES } from '@/components/AppIcon'

const meta = {
  title: 'Иконки',
  component: IconsPage,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Box UI | Icons (Solar) — 30 иконок приложения, 6 стилей из Figma-коллекции Icon. ' +
          'Переключите style в Controls, чтобы посмотреть остальные 5 вариаций.',
      },
    },
  },
  argTypes: {
    style: { control: 'select', options: ICON_STYLES.map((s) => s.value) },
  },
  args: {
    style: 'linear',
  },
} satisfies Meta<typeof IconsPage>

export default meta
type Story = StoryObj<typeof meta>

export const Иконки: Story = {}
