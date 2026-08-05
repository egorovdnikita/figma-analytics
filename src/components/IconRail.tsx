import { useApp, type Screen } from '@/state/store'
import { Avatar } from '@/components/ui'
import { AppIcon } from '@/components/AppIcon'
import { FigmaIcon } from '@/components/FigmaIcon'
import { CalendarBrandIcon, DriveBrandIcon, MailBrandIcon, TasksBrandIcon } from '@/components/RailBrandIcons'
import { cn } from '@/lib/cn'

/** Фирменные иконки не перекрашиваются через currentColor — неактивное
 * состояние показываем притушенной (40%) копией того же цветного значка. */
const SECTIONS: { screen: Screen; label: string; render: (active: boolean) => React.ReactNode }[] = [
  {
    screen: 'figma',
    label: 'Figma',
    render: (active) => <FigmaIcon size={20} className={active ? 'opacity-100' : 'opacity-40'} />,
  },
  {
    screen: 'calendar',
    label: 'Календарь',
    render: (active) => <CalendarBrandIcon size={20} className={active ? 'opacity-100' : 'opacity-40'} />,
  },
  {
    screen: 'mail',
    label: 'Почта',
    render: (active) => <MailBrandIcon size={20} className={active ? 'opacity-100' : 'opacity-40'} />,
  },
  {
    screen: 'drive',
    label: 'Диск',
    render: (active) => <DriveBrandIcon size={20} className={active ? 'opacity-100' : 'opacity-40'} />,
  },
  {
    screen: 'tasks',
    label: 'Задачи',
    render: (active) => <TasksBrandIcon size={20} className={active ? 'opacity-100' : 'opacity-40'} />,
  },
]

export function IconRail() {
  const { screen, setScreen, resolvedTheme, updateSettings, profile } = useApp()

  return (
    <aside className="flex h-full w-16 shrink-0 flex-col items-center gap-1 pt-3 pb-3">
      {SECTIONS.map((section) => (
        <RailItem
          key={section.screen}
          active={screen === section.screen}
          onClick={() => setScreen(section.screen)}
          icon={section.render(screen === section.screen)}
          label={section.label}
        />
      ))}

      <div className="flex-1" />

      <RailItem
        active={false}
        onClick={() => void updateSettings({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' })}
        icon={<AppIcon name={resolvedTheme === 'dark' ? 'Sun' : 'Moon'} size={20} />}
        label={resolvedTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      />
      <button
        type="button"
        onClick={() => setScreen('profile')}
        aria-label="Профиль"
        className="no-drag mt-1 flex h-11 w-11 items-center justify-center rounded-full transition-opacity hover:opacity-85"
      >
        <Avatar src={profile?.picture} name={profile?.name} size={32} />
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
          ? 'bg-surface text-ink'
          : 'text-faint hover:bg-[var(--sunken)] hover:text-ink',
      )}
    >
      {icon}
    </button>
  )
}
