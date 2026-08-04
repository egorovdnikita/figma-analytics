export interface Calendar {
  id: string
  summary: string
  summaryOverride?: string
  description?: string
  location?: string
  timeZone?: string
  colorId?: string
  backgroundColor?: string
  foregroundColor?: string
  selected?: boolean
  primary?: boolean
  accessRole: 'owner' | 'writer' | 'reader' | 'freeBusyReader' | string
  defaultReminders?: Reminder[]
}

export interface Reminder {
  method: 'popup' | 'email' | string
  minutes: number
}

export interface EventDate {
  date?: string
  dateTime?: string
  timeZone?: string
}

export interface Attendee {
  email: string
  displayName?: string
  organizer?: boolean
  self?: boolean
  optional?: boolean
  responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted' | string
}

export interface CalendarEvent {
  id: string
  calendarId: string
  status?: string
  htmlLink?: string
  summary?: string
  description?: string
  location?: string
  colorId?: string
  created?: string
  updated?: string
  start: EventDate
  end: EventDate
  recurrence?: string[]
  recurringEventId?: string
  transparency?: string
  visibility?: string
  hangoutLink?: string
  organizer?: { email?: string; displayName?: string; self?: boolean }
  creator?: { email?: string; displayName?: string; self?: boolean }
  attendees?: Attendee[]
  reminders?: { useDefault: boolean; overrides?: Reminder[] }
  eventType?: string
}

export type ViewMode = 'day' | 'week' | 'month' | 'agenda'
export type IconStyle = 'bold' | 'bold-duotone' | 'broken' | 'line-duotone' | 'linear' | 'outline'
export type FontVariant = 'inter' | 'inter-display' | 'inter-tight' | 'inter-variable'

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  defaultView: ViewMode
  firstDayOfWeek: 0 | 1
  timeFormat: '24h' | '12h'
  showWeekends: boolean
  showDeclined: boolean
  hiddenCalendarIds: string[]
  dayStartHour: number
  dayEndHour: number
  iconStyle: IconStyle
  iconStyleArrows: IconStyle
  fontFamily: FontVariant
}

export interface Profile {
  sub: string
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
  email?: string
  email_verified?: boolean
  locale?: string
  hd?: string
}

export interface AppInfo {
  version: string
  electron: string
  chrome: string
  node: string
  platform: string
  arch: string
  locale: string
  timeZone: string
  storage: { directory: string; encrypted: boolean }
}

export interface SessionInfo {
  scopes: string[]
  expiresAt: number
  hasRefreshToken: boolean
}

/* ---------- Figma ---------- */

export interface FigmaUser {
  id: string
  email: string
  handle: string
  img_url: string
}

export interface FigmaTeamRef {
  id: string
  label: string
}

export interface FigmaProject {
  id: string
  name: string
}

export interface FigmaFileSummary {
  key: string
  name: string
  thumbnail_url?: string
  last_modified: string
}

export interface FigmaFileMeta {
  name: string
  lastModified: string
  thumbnailUrl?: string
  version: string
  role: string
  editorType?: string
}

export interface FigmaVersion {
  id: string
  created_at: string
  label: string | null
  description: string | null
  user: { id: string; handle: string; img_url: string }
}

export interface FigmaComment {
  id: string
  parent_id: string
  user: { id: string; handle: string; img_url: string }
  created_at: string
  resolved_at: string | null
  message: string
  order_id: string | null
}

export interface FigmaPage<T> {
  items: T[]
  hasMore: boolean
  total: number
}

export interface FigmaCommentsPage extends FigmaPage<FigmaComment> {
  open: number
  resolved: number
}

export interface FigmaOverviewEntry {
  fileKey: string
  meta: Partial<FigmaFileMeta>
  versions: FigmaVersion[]
  comments: FigmaComment[]
  fetchedAt: number
}

/** Черновик события в форме — плоская структура, удобная для инпутов. */
export interface EventDraft {
  id?: string
  calendarId: string
  summary: string
  description: string
  location: string
  allDay: boolean
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  colorId?: string
  attendees: string
  recurrence: string
  reminderMinutes: number | null
  visibility: 'default' | 'public' | 'private'
  transparency: 'opaque' | 'transparent'
}
