import type { Meta, StoryObj } from '@storybook/react-vite'
import type { FigmaEvent, FigmaFileIndexEntry } from '@/types'
import { FilesPanel } from './FilesPanel'

/* Синтетическое пространство: у части файлов один хозяин, у части — команда;
 * передачи в разработку и публикации библиотеки идут вперемешку с обычными
 * сохранениями, как в реальной истории версий. */
const FILES = [
  { key: 'f1', name: 'Mobile App — Checkout', people: ['anna'] },
  { key: 'f2', name: 'Design System', people: ['ivan', 'anna', 'oleg'] },
  { key: 'f3', name: 'Landing v2', people: ['oleg'] },
  { key: 'f4', name: 'Admin Panel', people: ['maria', 'ivan'] },
  { key: 'f5', name: 'Onboarding', people: ['maria'] },
]

function seeded(seed: number) {
  let value = seed
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

function buildEvents(): FigmaEvent[] {
  const random = seeded(7)
  const events: FigmaEvent[] = []
  const now = Date.now()
  FILES.forEach((file, fileIndex) => {
    for (let i = 0; i < 40 + fileIndex * 6; i += 1) {
      const handle = file.people[Math.floor(random() * file.people.length)]
      const roll = random()
      events.push({
        kind: 'version',
        ts: new Date(now - random() * 60 * 86_400_000).toISOString(),
        userId: handle,
        handle,
        img: '',
        fileKey: file.key,
        fileName: file.name,
        projectId: 'p1',
        projectName: 'Product',
        teamId: 't1',
        teamName: 'Team',
        label:
          roll < 0.12
            ? 'Ready for dev'
            : roll < 0.18 && file.key === 'f2'
              ? 'Components published'
              : undefined,
      })
    }
  })
  return events.sort((a, b) => b.ts.localeCompare(a.ts))
}

const events = buildEvents()

const files: FigmaFileIndexEntry[] = FILES.map((file) => ({
  fileKey: file.key,
  name: file.name,
  projectId: 'p1',
  projectName: 'Product',
  teamId: 't1',
  teamName: 'Team',
  lastModified: new Date().toISOString(),
  thumbnailUrl: null,
  versions: events.filter((event) => event.fileKey === file.key).length,
  comments: 0,
  openComments: 0,
  versionsComplete: true,
  fetchedAt: Date.now(),
}))

const meta: Meta<typeof FilesPanel> = {
  title: 'Figma/Раздел «Файлы»',
  component: FilesPanel,
  parameters: { layout: 'padded' },
  args: { files, events, granularity: 'month', onOpenFile: () => {} },
}
export default meta

export const Пространство: StoryObj<typeof FilesPanel> = {}
