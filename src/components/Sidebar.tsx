import { CalendarDays, Plus, Settings2 } from 'lucide-react'
import { useApp } from '@/state/store'
import { cn } from '@/lib/cn'
import { Avatar, Button, Checkbox } from '@/components/ui'
import { MiniCalendar } from '@/components/MiniCalendar'

export function Sidebar({ onCreate }: { onCreate: () => void }) {
  const {
    calendars,
    settings,
    toggleCalendar,
    anchor,
    setAnchor,
    profile,
    screen,
    setScreen,
  } = useApp()

  const own = calendars.filter((c) => c.accessRole === 'owner' || c.primary)
  const shared = calendars.filter((c) => !own.includes(c))

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col gap-3 p-3 pr-0">
      <div className="drag-region flex h-11 items-center gap-2 pl-2 pt-1">
        <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-[var(--grass)]">
          <span className="h-2 w-2 rounded-full bg-[var(--lilac)]" />
        </span>
        <span className="text-[17px] font-bold tracking-tight text-ink">Box UI</span>
      </div>

      <div className="no-drag px-1">
        <Button variant="primary" size="lg" className="w-full justify-start" onClick={onCreate}>
          <Plus size={18} />
          Создать событие
        </Button>
      </div>

      <nav className="px-1">
        <NavItem
          active={screen === 'calendar'}
          onClick={() => setScreen('calendar')}
          icon={<CalendarDays size={17} />}
          label="Календарь"
        />
        <NavItem
          active={screen === 'profile'}
          onClick={() => setScreen('profile')}
          icon={<Settings2 size={17} />}
          label="Профиль и настройки"
        />
      </nav>

      <div className="scroll-thin flex-1 overflow-y-auto pr-2">
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

      <button
        type="button"
        onClick={() => setScreen('profile')}
        className="no-drag mr-2 flex items-center gap-2.5 rounded-card bg-surface p-2.5 text-left transition-colors hover:bg-[var(--sunken)]"
      >
        <Avatar src={profile?.picture} name={profile?.name} size={34} />
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-ink">
            {profile?.name ?? 'Аккаунт'}
          </span>
          <span className="block truncate text-[11px] text-muted">{profile?.email ?? ''}</span>
        </span>
      </button>
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
      className={cn(
        'flex w-full items-center gap-2.5 rounded-full px-3 py-2.5 text-[14px] transition-colors',
        active
          ? 'bg-[var(--grass-soft)] font-semibold text-ink'
          : 'text-muted hover:bg-[var(--sunken)] hover:text-ink',
      )}
    >
      {icon}
      {label}
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
