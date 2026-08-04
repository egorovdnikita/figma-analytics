import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Modal } from './Modal'
import { Button } from './Button'
import { Field, Input } from './Field'

const meta = {
  title: 'Компоненты/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    open: false,
    onClose: () => {},
    title: 'Новое событие',
    children: null,
  },
} satisfies Meta<typeof Modal>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: () => {
    const [open, setOpen] = useState(true)
    return (
      <div style={{ padding: 24 }}>
        <Button onClick={() => setOpen(true)}>Открыть модальное окно</Button>
        <Modal
          open={open}
          onClose={() => setOpen(false)}
          title="Новое событие"
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button variant="primary" onClick={() => setOpen(false)}>
                Сохранить
              </Button>
            </>
          }
        >
          <Field label="Название">
            <Input placeholder="Например, Синк по продукту" />
          </Field>
        </Modal>
      </div>
    )
  },
}
