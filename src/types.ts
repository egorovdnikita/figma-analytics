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

export interface FigmaCommentReaction {
  emoji: string
  created_at: string
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
  reactions: FigmaCommentReaction[]
}

export interface FigmaLibrarySummary {
  componentsCount: number
  componentSetsCount: number
  stylesCount: number
  lastPublished: string | null
  recent: Array<{
    key: string
    name: string
    kind: 'component' | 'component_set' | 'style'
    updatedAt: string
    user: { handle: string; img_url: string }
  }>
  byAuthor: Array<{ handle: string; img_url: string; count: number }>
}

export type FigmaEventKind = 'version' | 'comment' | 'reply' | 'resolve' | 'reaction'

export interface FigmaEvent {
  kind: FigmaEventKind
  ts: string
  userId: string
  handle: string
  img: string
  fileKey: string
  fileName: string
  projectId: string
  projectName: string
  teamId: string
  teamName: string
  label?: string
  message?: string
  emoji?: string
  threadId?: string
  nodeId?: string
}

export interface FigmaFileIndexEntry {
  fileKey: string
  name: string
  projectId: string
  projectName: string
  teamId: string
  teamName: string
  lastModified: string | null
  thumbnailUrl: string | null
  versions: number
  comments: number
  openComments: number
  versionsComplete: boolean
  fetchedAt: number
}

export interface FigmaDirectoryPerson {
  handle: string
  img: string
  events: number
  hidden: boolean
}

export interface FigmaInsightThresholds {
  staleDays: number
  unansweredDays: number
  concentrationPercent: number
  dropPercent: number
  nightSharePercent: number
}

export interface FigmaFilterPreset {
  id: string
  name: string
  filters: unknown
}

export interface FigmaPinnedFile {
  key: string
  name: string
}

export interface FigmaPrefs {
  workdayStart: number
  workdayEnd: number
  nightStart: number
  nightEnd: number
  weekendDays: number[]
  timelineBuckets: { day: number; week: number; month: number; year: number }
  syncDepthPages: number
  syncConcurrency: number
  /** Сколько спящих файлов дочитывать по комментариям за синк. */
  commentsRotation: number
  density: 'compact' | 'comfortable'
  defaultSection: string
  tablesByDefault: boolean
  insightThresholds: FigmaInsightThresholds
  filterPresets: FigmaFilterPreset[]
  pinnedFiles: FigmaPinnedFile[]
}

export interface FigmaCacheStats {
  files: number
  versions: number
  comments: number
  reactions: number
  incompleteFiles: number
  oldestEvent: string | null
  newestEvent: string | null
  bytes: number
  directory: string
  lastFetchedAt: number | null
}

export interface FigmaSyncProgress {
  phase: 'projects' | 'files' | 'history' | 'done'
  done: number
  total: number
  current: string
  /** Сколько ещё ждать снятия лимита Figma — 0, если очередь идёт свободно. */
  rateLimitMs: number
}

export type FigmaSyncFailureReason =
  | 'rate-limit'
  | 'forbidden'
  | 'expired'
  | 'missing'
  | 'unauthorized'
  | 'network'
  | 'unknown'

export type FigmaSyncFailureScope = 'team' | 'project' | 'file'

export interface FigmaSyncFailure {
  scope: FigmaSyncFailureScope
  name: string
  reason: FigmaSyncFailureReason
  /** Ответ Figma как есть: код и текст. */
  detail?: string
}

/** Состояние синхронизации в main-процессе: экран забирает его при открытии,
 * чтобы не потерять идущий обход при переходе между разделами. */
export interface FigmaSyncState {
  running: boolean
  progress: FigmaSyncProgress | null
  startedAt: number | null
  lastResult: (FigmaSyncResult & { startedAt: number }) | null
}

export interface FigmaSyncResult {
  /** Синхронизацию остановили вручную. */
  stopped: boolean
  files: number
  skipped: number
  /** Папки, состав которых взят из прошлого синка. */
  staleFolders: number
  versions: number
  comments: number
  errors: FigmaSyncFailure[]
  finishedAt: number
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
