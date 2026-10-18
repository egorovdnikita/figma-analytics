import { createContext, useContext, type ReactNode } from 'react'
import { Icon, addCollection } from '@iconify/react'
import solarIcons from '@/lib/solar-icons.json'
import type { IconStyle } from '@/types'

addCollection(solarIcons)

/**
 * Figma Analytics | Icons (Solar) — соответствие имён из lucide-react слагам в наборе Solar.
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
  Clock: 'clock-circle',
  ChevronLeft: 'alt-arrow-left',
  ChevronRight: 'alt-arrow-right',
  ExternalLink: 'square-arrow-right-up',
  KeyRound: 'key',
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
  TextFieldFocus: 'text-field-focus',
  Trash2: 'trash-bin-trash',
  Users: 'users-group-rounded',
  Video: 'videocamera',
  X: 'close-circle',
} as const

export type IconName = keyof typeof ICON_MAP
export const ICON_NAMES = Object.keys(ICON_MAP) as IconName[]
/** Порядок и подписи — как моды `icon-style` в Brand ・ Icon дизайн-системы. */
export const ICON_STYLES: { value: IconStyle; label: string }[] = [
  { value: 'bold', label: 'Bold' },
  { value: 'bold-duotone', label: 'Bold Duotone' },
  { value: 'broken', label: 'Broken' },
  { value: 'line-duotone', label: 'Line Duotone' },
  { value: 'linear', label: 'Linear' },
  { value: 'outline', label: 'Outline' },
]

/** Иконки со стрелками — настраиваются отдельным стилем от остальных (см. ProfileView). */
const ARROW_ICON_NAMES: ReadonlySet<IconName> = new Set<IconName>([
  'ArrowLeft',
  'ArrowRight',
  'ChevronDown',
  'ChevronLeft',
  'ChevronRight',
  'ExternalLink',
  'Search',
])

interface IconStyles {
  general: IconStyle
  arrows: IconStyle
}

const IconStyleContext = createContext<IconStyles>({ general: 'linear', arrows: 'linear' })

export function IconStyleProvider({
  general,
  arrows,
  children,
}: {
  general: IconStyle
  arrows: IconStyle
  children: ReactNode
}) {
  return (
    <IconStyleContext.Provider value={{ general, arrows }}>{children}</IconStyleContext.Provider>
  )
}

/**
 * Размеры иконок — токены `size/base/*` дизайн-системы box-ui: min 16 · 2xs 20 ·
 * xs 24 · s 28 · m 32 · l 36 · xl 40 · 2xl 44 · max 48. Тип не пускает другие
 * числа: размер «между» токенами раньше расползался по приложению сам собой
 * (14, 15, 22 — в двух десятках мест), а так его не соберёт TypeScript.
 */
export type IconSize = 16 | 20 | 24 | 28 | 32 | 36 | 40 | 44 | 48

export const ICON_SIZES: IconSize[] = [16, 20, 24, 28, 32, 36, 40, 44, 48]

export function useIconStyle(name: IconName) {
  const styles = useContext(IconStyleContext)
  return ARROW_ICON_NAMES.has(name) ? styles.arrows : styles.general
}

export function AppIcon({
  name,
  size = 20,
  className,
  color,
}: {
  name: IconName
  size?: IconSize
  className?: string
  color?: string
}) {
  const style = useIconStyle(name)
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
