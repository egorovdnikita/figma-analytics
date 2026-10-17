import { useEffect } from 'react'
import { AppProvider, useApp } from '@/state/store'
import { IconRail } from '@/components/IconRail'
import { ProfileView } from '@/components/ProfileView'
import { FigmaScreen } from '@/components/figma/FigmaScreen'
import { PlaceholderScreen } from '@/components/PlaceholderScreen'
import {
  CalendarBrandIcon,
  DriveBrandIcon,
  MailBrandIcon,
  TasksBrandIcon,
} from '@/components/RailBrandIcons'
import { SetupScreen, SignInScreen } from '@/components/Onboarding'
import { IconStyleProvider } from '@/components/AppIcon'
import { Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'
import { FONT_STACKS } from '@/lib/fonts'

function Shell() {
  const { booted, hasCredentials, authenticated, screen, notice, settings } = useApp()

  useEffect(() => {
    document.documentElement.style.setProperty('--font-body', FONT_STACKS[settings.fontFamily])
  }, [settings.fontFamily])

  if (!booted) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  let content: React.ReactNode
  if (!hasCredentials) content = <SetupScreen />
  else if (!authenticated) content = <SignInScreen />
  else
    content = (
      <IconStyleProvider general={settings.iconStyle} arrows={settings.iconStyleArrows}>
        <div className="flex h-full flex-col">
          {/* Отдельная полоса только под системные кнопки. Пока пустая — сюда позже
              встанут вкладки/разделы/папки. */}
          <div className="drag-region h-9 shrink-0" />

          <div className="flex min-h-0 flex-1">
            <IconRail />
            <div className="min-h-0 min-w-0 flex-1">
              {screen === 'profile' ? (
                <ProfileView />
              ) : screen === 'calendar' ? (
                <PlaceholderScreen icon={<CalendarBrandIcon size={32} />} title="Календарь" />
              ) : screen === 'mail' ? (
                <PlaceholderScreen icon={<MailBrandIcon size={32} />} title="Почта" />
              ) : screen === 'drive' ? (
                <PlaceholderScreen icon={<DriveBrandIcon size={32} />} title="Диск" />
              ) : screen === 'tasks' ? (
                <PlaceholderScreen icon={<TasksBrandIcon size={32} />} title="Задачи" />
              ) : (
                <FigmaScreen />
              )}
            </div>
          </div>
        </div>
      </IconStyleProvider>
    )

  return (
    <div className="h-full">
      {content}
      {notice ? (
        <div
          className={cn(
            'animate-pop fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full px-5 py-2.5 text-[14px] font-medium shadow-pop',
            notice.kind === 'error'
              ? 'bg-[var(--danger)] text-white'
              : notice.kind === 'success'
                ? 'bg-[var(--grass)] text-white'
                : 'bg-[var(--ink)] text-[var(--canvas)]',
          )}
          role="status"
        >
          {notice.text}
        </div>
      ) : null}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
