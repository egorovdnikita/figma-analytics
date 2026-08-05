import { useApp } from '@/state/store'
import { Button, Checkbox } from '@/components/ui'
import { MiniCalendar } from '@/components/MiniCalendar'

export function Sidebar({ onCreate }: { onCreate: () => void }) {
  const { calendars, settings, toggleCalendar, anchor, setAnchor } = useApp()

  const own = calendars.filter((c) => c.accessRole === 'owner' || c.primary)
  const shared = calendars.filter((c) => !own.includes(c))

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col gap-3 p-3 pr-0">
      <div className="no-drag pr-2">
        <Button variant="primary" size="md" className="w-full" onClick={onCreate}>
          Создать событие
        </Button>
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto pr-2">
        <div className="rounded-card bg-surface p-3">
          <MiniCalendar
            anchor={anchor}
            onPick={setAnchor}
            firstDayOfWeek={settings.firstDayOfWeek}
          />
        </div>

        <CalendarGroup
          title="Мои календари"
          items={own}
          hidden={settings.hiddenCalendarIds}
          onToggle={toggleCalendar}
        />
        {shared.length > 0 ? (
          <CalendarGroup
            title="Другие календари"
            items={shared}
            hidden={settings.hiddenCalendarIds}
            onToggle={toggleCalendar}
          />
        ) : null}
      </div>
    </aside>
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
      <h3 className="mb-1.5 pl-2 text-[12px] font-semibold text-faint">{title}</h3>
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
