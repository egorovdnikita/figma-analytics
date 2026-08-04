import { useState } from 'react'
import { Languages, ListTodo, MessageSquare } from 'lucide-react'
import { AppProvider, useApp } from '@/state/store'
import { Sidebar } from '@/components/Sidebar'
import { AppHeader } from '@/components/AppHeader'
import { CalendarScreen } from '@/components/CalendarScreen'
import { ProfileView } from '@/components/ProfileView'
import { PlaceholderScreen } from '@/components/PlaceholderScreen'
import { SetupScreen, SignInScreen } from '@/components/Onboarding'
import { Spinner } from '@/components/ui'
import { cn } from '@/lib/cn'

function Shell() {
  const { booted, hasCredentials, authenticated, screen, notice } = useApp()
  const [createSignal, setCreateSignal] = useState(0)

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
      <div className="flex h-full">
        <Sidebar onCreate={() => setCreateSignal((value) => value + 1)} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AppHeader />
          <div className="min-h-0 min-w-0 flex-1">
            {screen === 'profile' ? (
              <ProfileView />
            ) : screen === 'translator' ? (
              <PlaceholderScreen icon={Languages} title="Переводчик" />
            ) : screen === 'tasks' ? (
              <PlaceholderScreen icon={ListTodo} title="Задачи" />
            ) : screen === 'chat' ? (
              <PlaceholderScreen icon={MessageSquare} title="Чат" />
            ) : (
              <CalendarScreen
                createSignal={createSignal}
                onCreateHandled={() => setCreateSignal(0)}
              />
            )}
          </div>
        </div>
      </div>
    )

  return (
    <div className="h-full">
      {content}
      {notice ? (
        <div
          className={cn(
            'animate-pop fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-full px-5 py-2.5 text-[13px] font-medium shadow-pop',
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
