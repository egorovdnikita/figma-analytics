import type { Meta, StoryObj } from '@storybook/react-vite'
import { SyncStatus } from './SyncStatus'

const meta: Meta<typeof SyncStatus> = {
  title: 'Figma/SyncStatus',
  component: SyncStatus,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Состояние синхронизации в шапке раздела: покой, фоновое обновление, упор в лимит Figma и разбор ошибок прошлого обхода.',
      },
    },
  },
  args: {
    syncing: false,
    auto: false,
    progress: null,
    error: null,
    errorDetails: null,
    lastSyncAt: Date.now() - 7 * 60 * 1000,
    nextAutoSyncAt: Date.now() + 53 * 60 * 1000,
    onSync: () => {},
    onStop: () => {},
  },
}
export default meta

type Story = StoryObj<typeof SyncStatus>

export const Покой: Story = {}

export const НикогдаНеОбновлялось: Story = {
  args: { lastSyncAt: null, nextAutoSyncAt: null },
}

export const Синхронизация: Story = {
  args: {
    syncing: true,
    progress: { phase: 'history', done: 64, total: 182, current: 'Design System / Components', rateLimitMs: 0 },
  },
}

export const ФоновоеОбновление: Story = {
  args: {
    syncing: true,
    auto: true,
    progress: { phase: 'files', done: 3, total: 11, current: 'Marketing', rateLimitMs: 0 },
  },
}

export const УпёрлисьВЛимит: Story = {
  args: {
    syncing: true,
    auto: true,
    progress: { phase: 'history', done: 120, total: 182, current: 'Mobile App', rateLimitMs: 14_000 },
  },
}

export const СОшибками: Story = {
  args: {
    error: 'Не прочитано файлов: 3. 2 — нет доступа; 1 — файл удалён',
    errorDetails: 'Design System — нет доступа\nMobile App — нет доступа\nLanding v2 — файл удалён',
  },
}
