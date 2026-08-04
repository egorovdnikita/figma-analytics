import { useState } from 'react'
import { ArrowRight, ExternalLink, KeyRound, ShieldCheck } from 'lucide-react'
import { useApp } from '@/state/store'
import { ipc } from '@/lib/ipc'
import { Button, Field, Input, Spinner } from '@/components/ui'

function Brand() {
  return (
    <div className="mb-8 flex items-center gap-2.5">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[var(--grass)]">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--lilac)]" />
      </span>
      <span className="text-[22px] font-bold tracking-tight text-ink">Box UI</span>
    </div>
  )
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="drag-region flex h-full items-center justify-center p-8">
      <div className="no-drag w-full max-w-[520px] rounded-card bg-surface p-8">{children}</div>
    </div>
  )
}

export function SetupScreen() {
  const { saveCredentials, setNotice } = useApp()
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!clientId.trim()) {
      setNotice({ kind: 'error', text: 'Нужен Client ID' })
      return
    }
    setBusy(true)
    try {
      await saveCredentials({ clientId, clientSecret })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout>
      <Brand />
      <h1 className="text-[26px] font-bold lowercase leading-tight text-ink">
        подключите свой OAuth-клиент
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        Box UI работает напрямую с вашим аккаунтом Google — без промежуточного сервера. Нужны
        Client&nbsp;ID и Client&nbsp;Secret десктопного OAuth-клиента. Они хранятся только на этом
        компьютере.
      </p>

      <div className="mt-6 space-y-4">
        <Field label="Client ID">
          <Input
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
            placeholder="1234567890-abcdef.apps.googleusercontent.com"
            autoFocus
          />
        </Field>
        <Field label="Client Secret" hint="Для типа «Десктопное приложение» Google выдаёт его вместе с ID.">
          <Input
            type="password"
            value={clientSecret}
            onChange={(event) => setClientSecret(event.target.value)}
            placeholder="GOCSPX-…"
          />
        </Field>
      </div>

      <div className="mt-6 flex items-center gap-2">
        <Button variant="primary" size="lg" onClick={submit} disabled={busy}>
          {busy ? <Spinner /> : <KeyRound size={17} />}
          Сохранить и продолжить
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            void ipc.openExternal('https://console.cloud.google.com/apis/credentials')
          }
        >
          <ExternalLink size={16} />
          Google Cloud Console
        </Button>
      </div>

      <p className="mt-5 text-[12px] leading-relaxed text-faint">
        Пошаговая инструкция — в файле docs/google-setup.md репозитория.
      </p>
    </Layout>
  )
}

export function SignInScreen() {
  const { signIn } = useApp()
  const [busy, setBusy] = useState(false)

  return (
    <Layout>
      <Brand />
      <h1 className="text-[28px] font-bold lowercase leading-tight text-ink">
        ваш цифровой мозг начинается с календаря
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        Подключите аккаунт Google — Box UI покажет все ваши календари, события и участников, и
        позволит их менять прямо отсюда.
      </p>

      <ul className="mt-6 space-y-2.5">
        {[
          'Просмотр по дням, неделям, месяцам и списком',
          'Создание, редактирование и удаление событий',
          'Участники, повторения, напоминания и цвета',
        ].map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-[14px] text-ink">
            <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[var(--grass)]" />
            {item}
          </li>
        ))}
      </ul>

      <Button
        variant="primary"
        size="lg"
        className="mt-7 w-full"
        onClick={async () => {
          setBusy(true)
          try {
            await signIn()
          } finally {
            setBusy(false)
          }
        }}
        disabled={busy}
      >
        {busy ? <Spinner /> : null}
        Войти через Google
        <ArrowRight size={17} />
      </Button>

      <p className="mt-4 text-[12px] leading-relaxed text-faint">
        Вход откроется в системном браузере. Токены сохраняются локально и шифруются средствами
        операционной системы.
      </p>
    </Layout>
  )
}
