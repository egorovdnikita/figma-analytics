import { useState } from 'react'
import { ipc, IpcError } from '@/lib/ipc'
import type { FigmaTeamRef } from '@/types'
import { Button, Field, Input, Modal, Spinner } from '@/components/ui'
import { PlusGlyph } from '@/components/Glyphs'
import { cn } from '@/lib/cn'

type Parsed =
  | { kind: 'team'; id: string }
  | { kind: 'project'; id: string }
  | { kind: 'file'; id: string }
  | { kind: 'empty' }
  | { kind: 'unknown' }

/** Разбор ссылки Figma. Ссылки бывают четырёх видов, и раньше всё, что не
 * команда, превращалось в мусор: из строки просто вырезались цифры, так что
 * ссылка на файл давала случайный ID и непонятную ошибку доступа. Теперь вид
 * ссылки определяется честно, и на файл можно ответить по-человечески. */
export function parseFigmaLink(input: string): Parsed {
  const trimmed = input.trim()
  if (!trimmed) return { kind: 'empty' }

  // Папка проверяется первой: ссылка на папку внутри команды содержит оба ID,
  // и выбрать надо более узкий — кто хочет команду целиком, копирует ссылку со
  // страницы «all-projects», где ID папки нет.
  const project = trimmed.match(/\/project\/(\d+)/)
  if (project) return { kind: 'project', id: project[1] }

  const team = trimmed.match(/\/team\/(\d+)/)
  if (team) return { kind: 'team', id: team[1] }

  const file = trimmed.match(/\/(?:file|design|board|slides|proto|deck)\/([A-Za-z0-9]{10,})/)
  if (file) return { kind: 'file', id: file[1] }

  // Голый ID: у команд и папок он числовой.
  if (/^\d+$/.test(trimmed)) return { kind: 'team', id: trimmed }

  return { kind: 'unknown' }
}

const HINTS: Record<Parsed['kind'], string> = {
  team: 'Команда',
  project: 'Папка',
  // Из ссылки на файл команду не достать: Figma не отдаёт её ни в одном
  // ответе API — ни по ключу файла, ни по папке. Поэтому не гадаем.
  file: 'Это ссылка на файл — в ней нет ни команды, ни папки. Откройте файл в Figma, поднимитесь к его папке в сайдбаре и скопируйте ссылку оттуда.',
  empty: 'Вставьте ссылку на команду или папку Figma',
  unknown: 'Не похоже на ссылку Figma. Нужна ссылка вида figma.com/files/team/… или figma.com/files/project/…',
}

export function AddTeamModal({
  open,
  onClose,
  onAdded,
}: {
  open: boolean
  onClose: () => void
  onAdded: (teams: FigmaTeamRef[]) => void
}) {
  const [raw, setRaw] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = parseFigmaLink(raw)
  const canSubmit = parsed.kind === 'team' || parsed.kind === 'project'

  const reset = () => {
    setRaw('')
    setLabel('')
    setError(null)
  }

  const close = () => {
    reset()
    onClose()
  }

  const submit = async () => {
    if (!canSubmit) {
      setError(HINTS[parsed.kind])
      return
    }
    setBusy(true)
    setError(null)
    try {
      const next = await ipc.figmaTeamsAdd(parsed.id, label, parsed.kind)
      reset()
      onAdded(next)
    } catch (err) {
      setError(err instanceof IpcError ? err.message : 'Не удалось добавить источник')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Добавить источник"
      width={520}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Отмена
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy || !canSubmit}>
            {busy ? <Spinner /> : <PlusGlyph size={16} />}
            Добавить
          </Button>
        </>
      }
    >
      <p className="mb-4 text-[14px] leading-relaxed text-muted">
        Figma не отдаёт список команд по токену — источник нужно указать один раз вручную. Подойдёт
        ссылка на команду целиком или на отдельную папку: в аналитику попадут все файлы оттуда.
      </p>

      <div className="space-y-4">
        <Field
          label="Ссылка на команду или папку"
          hint="figma.com/files/team/… — вся команда · figma.com/files/project/… — одна папка"
        >
          <Input
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            placeholder="figma.com/files/team/… или 000000000000000000"
            autoFocus
            onKeyDown={(event) => event.key === 'Enter' && void submit()}
          />
        </Field>

        {parsed.kind !== 'empty' ? (
          <p
            className={cn(
              '-mt-2 text-[14px]',
              canSubmit ? 'text-muted' : 'text-[var(--danger-ink)]',
            )}
          >
            {canSubmit ? (
              <>
                {HINTS[parsed.kind]}, ID: <span className="font-medium text-ink">{parsed.id}</span>
              </>
            ) : (
              HINTS[parsed.kind]
            )}
          </p>
        ) : null}

        <Field label="Название" hint="Необязательно — если пусто, подставим название из Figma.">
          <Input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Как показывать в списке"
            onKeyDown={(event) => event.key === 'Enter' && void submit()}
          />
        </Field>

        {error ? (
          <p className="rounded-control bg-[var(--sunken)] px-3 py-2 text-[12px] text-[var(--danger-ink)]">{error}</p>
        ) : null}
      </div>
    </Modal>
  )
}
