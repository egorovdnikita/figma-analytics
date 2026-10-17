import { useState } from 'react'
import { format } from 'date-fns'
import { useApp } from '@/state/store'
import { ipc } from '@/lib/ipc'
import { ru as locale } from 'date-fns/locale'
import { cn } from '@/lib/cn'
import { Avatar, Button, Chip, Modal, Segmented } from '@/components/ui'
import { AppIcon, ICON_STYLES } from '@/components/AppIcon'
import { FONT_OPTIONS } from '@/lib/fonts'

const SCOPE_LABELS: Record<string, string> = {
  openid: 'Идентификатор аккаунта',
  email: 'Адрес почты',
  profile: 'Имя и фото',
  // Приложение этих разрешений больше не просит, но у токена, выданного старой
  // версии, они остались — показываем прямо, чтобы было видно, что их пора снять.
  'https://www.googleapis.com/auth/calendar': 'Календарь — лишнее разрешение из старой версии',
  'https://www.googleapis.com/auth/calendar.events':
    'События календаря — лишнее разрешение из старой версии',
}

export function ProfileView() {
  const {
    profile,
    session,
    appInfo,
    settings,
    updateSettings,
    signOut,
    revoke,
    setScreen,
    resolvedTheme,
  } = useApp()

  const [confirmRevoke, setConfirmRevoke] = useState(false)

  return (
    <div className="scroll-thin h-full overflow-y-auto pb-8">
      <div className="mx-auto max-w-[860px] space-y-3 px-4 pt-3">
        <button
          type="button"
          onClick={() => setScreen('figma')}
          className="flex items-center gap-2 py-1 text-[12px] text-muted transition-colors hover:text-ink"
        >
          <AppIcon name="ArrowLeft" size={16} />
          к аналитике
        </button>

        <section className="rounded-card bg-surface p-6">
          <div className="flex items-center gap-4">
            <Avatar src={profile?.picture} name={profile?.name} size={64} />
            <div className="min-w-0">
              <h2 className="truncate text-[24px] font-bold leading-tight text-ink">
                {profile?.name ?? 'Аккаунт не подключён'}
              </h2>
              <p className="truncate text-[14px] text-muted">{profile?.email}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile?.email_verified ? <Chip tone="grass">Почта подтверждена</Chip> : null}
                {profile?.hd ? <Chip tone="lilac">{profile.hd}</Chip> : null}
                {profile?.locale ? <Chip>{profile.locale}</Chip> : null}
                {appInfo ? <Chip>{appInfo.timeZone}</Chip> : null}
              </div>
            </div>
          </div>
        </section>

        <Card title="Доступ к Google">
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <Meta label="Токен обновления" value={session?.hasRefreshToken ? 'есть' : 'нет'} />
              <Meta
                label="Access-токен действует до"
                value={
                  session?.expiresAt
                    ? format(new Date(session.expiresAt), 'd MMM, HH:mm', { locale })
                    : '—'
                }
              />
            </div>
            <div>
              <div className="mb-1.5 text-xs font-medium text-muted">Выданные разрешения</div>
              <div className="flex flex-wrap gap-1.5">
                {(session?.scopes ?? []).map((scope) => (
                  <Chip key={scope} tone="neutral">
                    {SCOPE_LABELS[scope] ?? scope}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => void ipc.openExternal('https://myaccount.google.com/permissions')}
              >
                <AppIcon name="ExternalLink" size={16} />
                Управление доступом в Google
              </Button>
              <Button variant="soft" onClick={() => void signOut()}>
                <AppIcon name="LogOut" size={16} />
                Выйти
              </Button>
              <Button variant="danger" onClick={() => setConfirmRevoke(true)}>
                <AppIcon name="ShieldOff" size={16} />
                Отозвать доступ
              </Button>
            </div>
          </div>
        </Card>

        <Card title="Внешний вид">
          <div className="space-y-4">
            <Row label="Тема">
              <Segmented
                className="bg-[var(--sunken)]"
                value={settings.theme}
                onChange={(value) => void updateSettings({ theme: value })}
                options={[
                  { value: 'light', label: 'светлая' },
                  { value: 'dark', label: 'тёмная' },
                  { value: 'system', label: 'как в системе' },
                ]}
              />
            </Row>
            <Row label="Сейчас применена">
              <span className="text-[12px] text-muted">
                {resolvedTheme === 'dark' ? 'тёмная' : 'светлая'}
              </span>
            </Row>
            <Row label="Стиль иконок">
              <Segmented
                className="bg-[var(--sunken)]"
                value={settings.iconStyle}
                onChange={(value) => void updateSettings({ iconStyle: value })}
                options={ICON_STYLES}
              />
            </Row>
            <Row label="Стиль иконок со стрелками">
              <Segmented
                className="bg-[var(--sunken)]"
                value={settings.iconStyleArrows}
                onChange={(value) => void updateSettings({ iconStyleArrows: value })}
                options={ICON_STYLES}
              />
            </Row>
            <Row label="Шрифт">
              <Segmented
                className="bg-[var(--sunken)]"
                value={settings.fontFamily}
                onChange={(value) => void updateSettings({ fontFamily: value })}
                options={FONT_OPTIONS}
              />
            </Row>
          </div>
        </Card>

        <Card title="О приложении">
          <div className="grid gap-2 sm:grid-cols-2">
            <Meta label="Figma Analytics" value={appInfo?.version ?? '—'} />
            <Meta label="Платформа" value={`${appInfo?.platform ?? ''} ${appInfo?.arch ?? ''}`} />
            <Meta label="Electron / Chromium" value={`${appInfo?.electron ?? ''} / ${appInfo?.chrome ?? ''}`} />
            <Meta
              label="Хранилище"
              value={appInfo?.storage.encrypted ? 'зашифровано системой' : 'без шифрования'}
            />
          </div>
          <p className="mt-3 break-all text-[12px] text-faint">{appInfo?.storage.directory}</p>
        </Card>
      </div>

      <Modal
        open={confirmRevoke}
        onClose={() => setConfirmRevoke(false)}
        title="Отозвать доступ к Google?"
        width={460}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmRevoke(false)}>
              Отмена
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                setConfirmRevoke(false)
                await revoke()
              }}
            >
              Отозвать
            </Button>
          </>
        }
      >
        <p className="pb-4 text-[14px] leading-relaxed text-muted">
          Figma Analytics удалит сохранённые токены и отзовёт разрешение на стороне Google.
          Аккаунт и его данные останутся без изменений — приложение просто перестанет вас узнавать,
          и для входа понадобится подключить Google заново.
        </p>
      </Modal>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card bg-surface p-6">
      <h3 className="mb-4 text-[14px] font-semibold text-ink">{title}</h3>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[14px] text-ink">{label}</span>
      {children}
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn('rounded-control bg-[var(--sunken)] px-3.5 py-2.5')}>
      <div className="text-[12px] text-muted">{label}</div>
      <div className="truncate text-[14px] text-ink">{value}</div>
    </div>
  )
}

