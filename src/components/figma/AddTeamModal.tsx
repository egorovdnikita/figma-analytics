import { useState } from 'react'
import { ipc, IpcError } from '@/lib/ipc'
import type { FigmaTeamRef } from '@/types'
import { Button, Field, Input, Modal, Spinner } from '@/components/ui'
import { PlusGlyph } from '@/components/Glyphs'

/** Из ссылки вида figma.com/files/team/1388.../all-projects достаём ID, чтобы
 * не заставлять выковыривать его из URL руками. */
function parseTeamId(input: string) {
  const trimmed = input.trim()
  const match = trimmed.match(/\/team\/(\d+)/)
  if (match) return match[1]
  return trimmed.replace(/[^\d]/g, '') || trimmed
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

  const teamId = parseTeamId(raw)

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
    if (!teamId) {
      setError('Нужен ID команды или ссылка на неё')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const next = await ipc.figmaTeamsAdd(teamId, label)
      reset()
      onAdded(next)
    } catch (err) {
      setError(err instanceof IpcError ? err.message : 'Не удалось добавить команду')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Добавить команду"
      width={520}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>
            Отмена
          </Button>
          <Button variant="primary" onClick={submit} disabled={busy || !teamId}>
            {busy ? <Spinner /> : <PlusGlyph size={16} />}
            Добавить
          </Button>
        </>
      }
    >
      <p className="mb-4 text-[14px] leading-relaxed text-muted">
        Figma не отдаёт список команд по токену — команду нужно указать один раз вручную. Вставьте
        ссылку на страницу команды или её ID.
      </p>

      <div className="space-y-4">
        <Field
          label="Ссылка или ID команды"
          hint="Например: https://www.figma.com/files/team/000000000000000000/all-projects"
        >
          <Input
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            placeholder="figma.com/files/team/… или 000000000000000000"
            autoFocus
            onKeyDown={(event) => event.key === 'Enter' && void submit()}
          />
        </Field>

        {teamId && teamId !== raw.trim() ? (
          <p className="-mt-2 text-[13px] text-muted">
            Распознан ID: <span className="font-medium text-ink">{teamId}</span>
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
          <p className="rounded-control bg-[var(--sunken)] px-3 py-2 text-[13px] text-[var(--danger)]">{error}</p>
        ) : null}
      </div>
    </Modal>
  )
}
