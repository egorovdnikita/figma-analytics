import { CalendarDays, Languages, ListTodo, MessageSquare, Moon, Sun } from 'lucide-react'
import { useApp, type Screen } from '@/state/store'
import { Avatar } from '@/components/ui'
import { cn } from '@/lib/cn'

const SECTIONS: { screen: Screen; label: string; icon: typeof CalendarDays }[] = [
  { screen: 'calendar', label: 'Календарь', icon: CalendarDays },
  { screen: 'translator', label: 'Переводчик', icon: Languages },
  { screen: 'tasks', label: 'Задачи', icon: ListTodo },
  { screen: 'chat', label: 'Чат', icon: MessageSquare },
]

export function IconRail() {
  const { screen, setScreen, resolvedTheme, updateSettings, profile } = useApp()

  return (
    <aside className="relative flex h-full w-16 shrink-0 flex-col items-center gap-1 border-r border-line pt-14 pb-3">
      <div className="drag-region absolute inset-x-0 top-0 h-14" />

      {SECTIONS.map((section) => (
        <RailItem
          key={section.screen}
          active={screen === section.screen}
          onClick={() => setScreen(section.screen)}
          icon={<section.icon size={20} />}
          label={section.label}
        />
      ))}

      <div className="flex-1" />

      <RailItem
        active={false}
        onClick={() => void updateSettings({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' })}
        icon={resolvedTheme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
        label={resolvedTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      />
      <button
        type="button"
        onClick={() => setScreen('profile')}
        aria-label="Профиль"
        className="no-drag mt-1 flex h-11 w-11 items-center justify-center rounded-full transition-opacity hover:opacity-85"
      >
        <Avatar src={profile?.picture} name={profile?.name} size={30} />
      </button>
    </aside>
  )
}

function RailItem({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        'no-drag flex h-11 w-11 items-center justify-center rounded-control transition-colors',
        active
          ? 'bg-surface text-[var(--grass)] shadow-sm'
          : 'text-muted hover:bg-[var(--sunken)] hover:text-ink',
      )}
    >
      {icon}
    </button>
  )
}
