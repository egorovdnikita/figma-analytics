import { CalendarDays, Languages, ListTodo, MessageSquare, Plus } from 'lucide-react'
import { useApp, type Screen } from '@/state/store'
import { cn } from '@/lib/cn'
import { Button, Checkbox } from '@/components/ui'
import { MiniCalendar } from '@/components/MiniCalendar'
import { ScrollFadeTop } from '@/components/ScrollFade'

const SECTIONS: { screen: Screen; label: string; icon: typeof CalendarDays }[] = [
  { screen: 'calendar', label: 'Календарь', icon: CalendarDays },
  { screen: 'translator', label: 'Переводчик', icon: Languages },
  { screen: 'tasks', label: 'Задачи', icon: ListTodo },
  { screen: 'chat', label: 'Чат', icon: MessageSquare },
]

export function Sidebar({ onCreate }: { onCreate: () => void }) {
  const { calendars, settings, toggleCalendar, anchor, setAnchor, screen, setScreen } = useApp()

  const own = calendars.filter((c) => c.accessRole === 'owner' || c.primary)
  const shared = calendars.filter((c) => !own.includes(c))

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col gap-3 p-3 pr-0">
      <div className="drag-region h-11" />

      <div className="no-drag px-1">
        <Button variant="primary" size="lg" className="w-full justify-start" onClick={onCreate}>
          <Plus size={18} />
          Создать событие
        </Button>
      </div>

      <nav className="mx-1 flex items-center justify-between rounded-card bg-surface p-1.5">
        {SECTIONS.map((section) => (
          <NavItem
            key={section.screen}
            active={screen === section.screen}
            onClick={() => setScreen(section.screen)}
            icon={<section.icon size={19} />}
            label={section.label}
          />
        ))}
      </nav>

      <div className="relative min-h-0 flex-1">
        <div className="scroll-thin h-full overflow-y-auto pr-2">
          <div className="rounded-card bg-surface p-3">
            <MiniCalendar
              anchor={anchor}
              onPick={setAnchor}
              firstDayOfWeek={settings.firstDayOfWeek}
            />
          </div>

          <CalendarGroup
            title="мои календари"
            items={own}
            hidden={settings.hiddenCalendarIds}
            onToggle={toggleCalendar}
          />
          {shared.length > 0 ? (
            <CalendarGroup
              title="другие календари"
              items={shared}
              hidden={settings.hiddenCalendarIds}
              onToggle={toggleCalendar}
            />
          ) : null}
        </div>
        <ScrollFadeTop />
      </div>
    </aside>
  )
}

function NavItem({
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
        'flex h-10 w-10 items-center justify-center rounded-control transition-colors',
        active ? 'text-[var(--grass)]' : 'text-muted hover:bg-[var(--sunken)] hover:text-ink',
      )}
    >
      {icon}
    </button>
  )
}

function CalendarGroup({
  title,
  items,
  hidden,
  onToggle,
}: {
  title: string
  items: { id: string; summary: string; summaryOverride?: string; backgroundColor?: string }[]
  hidden: string[]
  onToggle: (id: string) => void
}) {
  if (!items.length) return null
  return (
    <section className="mt-3 rounded-card bg-surface p-3">
      <h3 className="mb-1.5 pl-2 text-[12px] font-semibold lowercase text-muted">{title}</h3>
      <div className="space-y-0.5">
        {items.map((calendar) => (
          <Checkbox
            key={calendar.id}
            checked={!hidden.includes(calendar.id)}
            onChange={() => onToggle(calendar.id)}
            color={calendar.backgroundColor}
            label={calendar.summaryOverride ?? calendar.summary}
          />
        ))}
      </div>
    </section>
  )
}
