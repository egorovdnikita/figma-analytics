import { createContext, useContext, type ReactNode } from 'react'
import { Icon, addCollection } from '@iconify/react'
import solarIcons from '@/lib/solar-icons.json'
import type { IconStyle } from '@/types'

addCollection(solarIcons)

/**
 * Box UI | Icons (Solar) — соответствие имён из lucide-react слагам в наборе Solar.
 * Источник: https://www.figma.com/design/9pupgeWag4Ssc7jdAYvXMt (коллекция Icon, 6 модов).
 */
const ICON_MAP = {
  AlignLeft: 'align-left',
  ArrowLeft: 'arrow-left',
  ArrowRight: 'arrow-right',
  Bell: 'bell',
  CalendarClock: 'calendar-mark',
  CalendarDays: 'calendar',
  CalendarOff: 'calendar-minimalistic',
  Check: 'check-circle',
  ChevronDown: 'alt-arrow-down',
  ChevronLeft: 'alt-arrow-left',
  ChevronRight: 'alt-arrow-right',
  ExternalLink: 'square-arrow-right-up',
  KeyRound: 'key',
  Languages: 'translation',
  ListTodo: 'checklist',
  LogOut: 'logout',
  MapPin: 'map-point',
  MessageSquare: 'chat-square',
  Moon: 'moon',
  Plus: 'add-circle',
  RefreshCw: 'refresh',
  Repeat: 'repeat',
  Search: 'magnifer',
  ShieldCheck: 'shield-check',
  ShieldOff: 'shield-cross',
  Sun: 'sun',
  Trash2: 'trash-bin-trash',
  Users: 'users-group-rounded',
  Video: 'videocamera',
  X: 'close-circle',
} as const

export type IconName = keyof typeof ICON_MAP
export const ICON_NAMES = Object.keys(ICON_MAP) as IconName[]
export const ICON_STYLES: { value: IconStyle; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'outline', label: 'Outline' },
  { value: 'bold', label: 'Bold' },
  { value: 'bold-duotone', label: 'Bold Duotone' },
  { value: 'broken', label: 'Broken' },
  { value: 'line-duotone', label: 'Line Duotone' },
]

const IconStyleContext = createContext<IconStyle>('linear')

export function IconStyleProvider({
  style,
  children,
}: {
  style: IconStyle
  children: ReactNode
}) {
  return <IconStyleContext.Provider value={style}>{children}</IconStyleContext.Provider>
}

export function useIconStyle() {
  return useContext(IconStyleContext)
}

export function AppIcon({
  name,
  size = 20,
  className,
  color,
}: {
  name: IconName
  size?: number
  className?: string
  color?: string
}) {
  const style = useIconStyle()
  return (
    <Icon
      icon={`solar:${ICON_MAP[name]}-${style}`}
      width={size}
      height={size}
      className={className}
      color={color}
    />
  )
}
