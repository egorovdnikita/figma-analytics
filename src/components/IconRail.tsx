import { CalendarDays, Languages, ListTodo, MessageSquare } from 'lucide-react'
import { useApp, type Screen } from '@/state/store'
import { cn } from '@/lib/cn'

const SECTIONS: { screen: Screen; label: string; icon: typeof CalendarDays }[] = [
  { screen: 'calendar', label: 'Календарь', icon: CalendarDays },
  { screen: 'translator', label: 'Переводчик', icon: Languages },
  { screen: 'tasks', label: 'Задачи', icon: ListTodo },
  { screen: 'chat', label: 'Чат', icon: MessageSquare },
]

export function IconRail() {
  const { screen, setScreen } = useApp()

  return (
    <aside className="relative flex h-full w-16 shrink-0 flex-col items-center gap-1 border-r border-line bg-surface pt-14">
      <div className="drag-region absolute inset-x-0 top-0 h-14 border-b border-line" />
      {SECTIONS.map((section) => (
        <RailItem
          key={section.screen}
          active={screen === section.screen}
          onClick={() => setScreen(section.screen)}
          icon={<section.icon size={20} />}
          label={section.label}
        />
      ))}
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
        active ? 'text-[var(--grass)]' : 'text-muted hover:bg-[var(--sunken)] hover:text-ink',
      )}
    >
      {icon}
    </button>
  )
}
