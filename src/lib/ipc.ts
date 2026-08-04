import type {
  AppInfo,
  AppSettings,
  Calendar,
  CalendarEvent,
  FigmaCommentsPage,
  FigmaFileMeta,
  FigmaFileSummary,
  FigmaOverviewEntry,
  FigmaPage,
  FigmaProject,
  FigmaTeamRef,
  FigmaUser,
  FigmaVersion,
  Profile,
  SessionInfo,
} from '@/types'

type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } }

interface RawApi {
  auth: {
    state(): Promise<Envelope<{ hasCredentials: boolean; authenticated: boolean; session: SessionInfo | null }>>
    signIn(): Promise<Envelope<SessionInfo | null>>
    signOut(): Promise<Envelope<void>>
    revoke(): Promise<Envelope<void>>
    profile(): Promise<Envelope<Profile>>
  }
  credentials: {
    get(): Promise<Envelope<{ clientId: string; hasSecret: boolean }>>
    set(creds: { clientId: string; clientSecret: string }): Promise<Envelope<boolean>>
    clear(): Promise<Envelope<boolean>>
  }
  calendar: {
    list(): Promise<Envelope<Calendar[]>>
    setSelected(id: string, selected: boolean): Promise<Envelope<Calendar>>
    colors(): Promise<Envelope<{ event: Record<string, { background: string; foreground: string }> }>>
    googleSettings(): Promise<Envelope<Record<string, string>>>
  }
  events: {
    list(args: {
      calendarId: string
      timeMin: string
      timeMax: string
      query?: string
    }): Promise<Envelope<CalendarEvent[]>>
    create(calendarId: string, event: unknown): Promise<Envelope<CalendarEvent>>
    update(calendarId: string, eventId: string, patch: unknown): Promise<Envelope<CalendarEvent>>
    remove(calendarId: string, eventId: string): Promise<Envelope<{ ok: boolean }>>
    respond(calendarId: string, eventId: string, response: string): Promise<Envelope<CalendarEvent>>
  }
  settings: {
    get(): Promise<Envelope<AppSettings>>
    set(patch: Partial<AppSettings>): Promise<Envelope<AppSettings>>
  }
  app: {
    info(): Promise<Envelope<AppInfo>>
    openExternal(url: string): Promise<Envelope<boolean>>
  }
  figma: {
    status(): Promise<Envelope<{ connected: boolean; user: FigmaUser | null }>>
    setToken(token: string): Promise<Envelope<FigmaUser>>
    clearToken(): Promise<Envelope<boolean>>
    teamsList(): Promise<Envelope<FigmaTeamRef[]>>
    teamsAdd(id: string, label: string): Promise<Envelope<FigmaTeamRef[]>>
    teamsRemove(id: string): Promise<Envelope<FigmaTeamRef[]>>
    projects(teamId: string): Promise<Envelope<FigmaProject[]>>
    files(projectId: string): Promise<Envelope<FigmaFileSummary[]>>
    file(fileKey: string): Promise<Envelope<FigmaFileMeta>>
    versions(fileKey: string, offset: number, limit: number): Promise<Envelope<FigmaPage<FigmaVersion>>>
    comments(fileKey: string, offset: number, limit: number): Promise<Envelope<FigmaCommentsPage>>
    overview(): Promise<Envelope<FigmaOverviewEntry[]>>
  }
}

declare global {
  interface Window {
    boxui: RawApi
  }
}

export class BoxUiError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

async function unwrap<T>(promise: Promise<Envelope<T>>): Promise<T> {
  const result = await promise
  if (!result.ok) throw new BoxUiError(result.error.code, result.error.message)
  return result.data
}

const raw = () => window.boxui

export const ipc = {
  authState: () => unwrap(raw().auth.state()),
  signIn: () => unwrap(raw().auth.signIn()),
  signOut: () => unwrap(raw().auth.signOut()),
  revoke: () => unwrap(raw().auth.revoke()),
  profile: () => unwrap(raw().auth.profile()),

  getCredentials: () => unwrap(raw().credentials.get()),
  setCredentials: (creds: { clientId: string; clientSecret: string }) =>
    unwrap(raw().credentials.set(creds)),
  clearCredentials: () => unwrap(raw().credentials.clear()),

  listCalendars: () => unwrap(raw().calendar.list()),
  setCalendarSelected: (id: string, selected: boolean) =>
    unwrap(raw().calendar.setSelected(id, selected)),
  eventColors: () => unwrap(raw().calendar.colors()),
  googleSettings: () => unwrap(raw().calendar.googleSettings()),

  listEvents: (args: { calendarId: string; timeMin: string; timeMax: string; query?: string }) =>
    unwrap(raw().events.list(args)),
  createEvent: (calendarId: string, event: unknown) =>
    unwrap(raw().events.create(calendarId, event)),
  updateEvent: (calendarId: string, eventId: string, patch: unknown) =>
    unwrap(raw().events.update(calendarId, eventId, patch)),
  deleteEvent: (calendarId: string, eventId: string) =>
    unwrap(raw().events.remove(calendarId, eventId)),
  respondToEvent: (calendarId: string, eventId: string, response: string) =>
    unwrap(raw().events.respond(calendarId, eventId, response)),

  getSettings: () => unwrap(raw().settings.get()),
  setSettings: (patch: Partial<AppSettings>) => unwrap(raw().settings.set(patch)),

  appInfo: () => unwrap(raw().app.info()),
  openExternal: (url: string) => unwrap(raw().app.openExternal(url)),

  figmaStatus: () => unwrap(raw().figma.status()),
  figmaSetToken: (token: string) => unwrap(raw().figma.setToken(token)),
  figmaClearToken: () => unwrap(raw().figma.clearToken()),
  figmaTeamsList: () => unwrap(raw().figma.teamsList()),
  figmaTeamsAdd: (id: string, label: string) => unwrap(raw().figma.teamsAdd(id, label)),
  figmaTeamsRemove: (id: string) => unwrap(raw().figma.teamsRemove(id)),
  figmaProjects: (teamId: string) => unwrap(raw().figma.projects(teamId)),
  figmaFiles: (projectId: string) => unwrap(raw().figma.files(projectId)),
  figmaFile: (fileKey: string) => unwrap(raw().figma.file(fileKey)),
  figmaVersions: (fileKey: string, offset: number, limit: number) =>
    unwrap(raw().figma.versions(fileKey, offset, limit)),
  figmaComments: (fileKey: string, offset: number, limit: number) =>
    unwrap(raw().figma.comments(fileKey, offset, limit)),
  figmaOverview: () => unwrap(raw().figma.overview()),
}
