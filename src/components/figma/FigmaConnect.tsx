import { useState } from 'react'
import { ipc, BoxUiError } from '@/lib/ipc'
import type { FigmaUser } from '@/types'
import { Button, Field, Input, Spinner } from '@/components/ui'
import { AppIcon } from '@/components/AppIcon'
import { FigmaIcon } from '@/components/FigmaIcon'

export function FigmaConnect({ onConnected }: { onConnected: (user: FigmaUser) => void }) {
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!token.trim()) {
      setError('Введите personal access token')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const user = await ipc.figmaSetToken(token)
      onConnected(user)
    } catch (err) {
      setError(err instanceof BoxUiError ? err.message : 'Не удалось подключиться')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="drag-region flex h-full items-center justify-center p-8">
      <div className="no-drag w-full max-w-[520px] rounded-card bg-surface p-8">
        <div className="mb-8">
          <FigmaIcon size={28} />
        </div>

        <h1 className="text-[28px] font-semibold leading-tight text-ink">Подключите Figma</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted">
          Box UI покажет проекты, файлы, историю версий и обсуждения вашего пространства Figma.
          Нужен personal access token — он хранится только на этом компьютере и шифруется
          средствами операционной системы.
        </p>

        <div className="mt-6">
          <Field
            label="Personal access token"
            hint="Figma → Settings → Security → Personal access tokens. Достаточно прав на чтение (File content)."
          >
            <Input
              type="password"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="figd_…"
              autoFocus
              onKeyDown={(event) => event.key === 'Enter' && void submit()}
            />
          </Field>
          {error ? <p className="mt-2 text-[13px] text-[var(--danger)]">{error}</p> : null}
        </div>

        <div className="mt-6 flex items-center gap-2">
          <Button variant="primary" size="lg" onClick={submit} disabled={busy}>
            {busy ? <Spinner /> : <AppIcon name="KeyRound" size={16} />}
            Подключить
          </Button>
          <Button
            variant="ghost"
            onClick={() => void ipc.openExternal('https://www.figma.com/developers/api#access-tokens')}
          >
            <AppIcon name="ExternalLink" size={16} />
            Как получить токен
          </Button>
        </div>
      </div>
    </div>
  )
}
