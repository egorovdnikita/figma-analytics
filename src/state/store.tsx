import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { addDays } from 'date-fns'
import { ipc, IpcError } from '@/lib/ipc'
import { rangeFor } from '@/lib/date'
import type {
  AppInfo,
  AppSettings,
  Calendar,
  CalendarEvent,
  Profile,
  SessionInfo,
  ViewMode,
} from '@/types'

export type Screen = 'calendar' | 'profile' | 'mail' | 'drive' | 'tasks' | 'figma'
type Notice = { kind: 'info' | 'error' | 'success'; text: string } | null

const defaultSettings: AppSettings = {
  theme: 'system',
  defaultView: 'week',
  firstDayOfWeek: 1,
  timeFormat: '24h',
  showWeekends: true,
  showDeclined: true,
  hiddenCalendarIds: [],
  dayStartHour: 0,
  dayEndHour: 24,
  iconStyle: 'linear',
  iconStyleArrows: 'linear',
  fontFamily: 'inter-variable',
}

interface AppContextValue {
  booted: boolean
  hasCredentials: boolean
  authenticated: boolean
  profile: Profile | null
  session: SessionInfo | null
  appInfo: AppInfo | null
  googleSettings: Record<string, string>

  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
  resolvedTheme: 'light' | 'dark'

  calendars: Calendar[]
  visibleCalendars: Calendar[]
  events: CalendarEvent[]
  loading: boolean
  syncedAt: Date | null

  screen: Screen
  setScreen: (screen: Screen) => void
  view: ViewMode
  setView: (view: ViewMode) => void
  anchor: Date
  setAnchor: (date: Date) => void
  query: string
  setQuery: (value: string) => void

  notice: Notice
  setNotice: (notice: Notice) => void

  signIn: () => Promise<void>
  signOut: () => Promise<void>
  revoke: () => Promise<void>
  saveCredentials: (creds: { clientId: string; clientSecret: string }) => Promise<void>

  refresh: () => Promise<void>
  toggleCalendar: (id: string) => Promise<void>
  createEvent: (calendarId: string, body: unknown) => Promise<void>
  updateEvent: (calendarId: string, eventId: string, patch: unknown) => Promise<void>
  deleteEvent: (calendarId: string, eventId: string) => Promise<void>
  respond: (calendarId: string, eventId: string, response: string) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [booted, setBooted] = useState(false)
  const [hasCredentials, setHasCredentials] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)
  const [googleSettings, setGoogleSettings] = useState<Record<string, string>>({})

  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  const [calendars, setCalendars] = useState<Calendar[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [syncedAt, setSyncedAt] = useState<Date | null>(null)

  const [screen, setScreen] = useState<Screen>('calendar')
  const [view, setViewState] = useState<ViewMode>('week')
  const [anchor, setAnchor] = useState<Date>(() => new Date())
  const [query, setQuery] = useState('')
  const [notice, setNotice] = useState<Notice>(null)

  const requestId = useRef(0)

  /* ---------- тема ---------- */

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme: 'light' | 'dark' =
    settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', resolvedTheme === 'dark')
    root.classList.toggle('light', resolvedTheme === 'light')
  }, [resolvedTheme])

  /* ---------- инициализация ---------- */

  const loadAccount = useCallback(async () => {
    const state = await ipc.authState()
    setHasCredentials(state.hasCredentials)
    setAuthenticated(state.authenticated)
    setSession(state.session)
    return state
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [stored, info] = await Promise.all([ipc.getSettings(), ipc.appInfo()])
        if (!alive) return
        setSettings(stored)
        setViewState(stored.defaultView)
        setAppInfo(info)
        await loadAccount()
      } catch (error) {
        setNotice({ kind: 'error', text: describe(error) })
      } finally {
        if (alive) setBooted(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [loadAccount])

  /* ---------- данные аккаунта ---------- */

  const loadAccountData = useCallback(async () => {
    try {
      const [me, list] = await Promise.all([ipc.profile(), ipc.listCalendars()])
      setProfile(me)
      setCalendars(list)
      ipc
        .googleSettings()
        .then(setGoogleSettings)
        .catch(() => undefined)
    } catch (error) {
      if ((error as IpcError).code === 'REAUTH_REQUIRED') {
        setAuthenticated(false)
        setNotice({ kind: 'error', text: 'Сессия истекла. Войдите заново.' })
        return
      }
      setNotice({ kind: 'error', text: describe(error) })
    }
  }, [])

  useEffect(() => {
    if (authenticated) void loadAccountData()
    else {
      setProfile(null)
      setCalendars([])
      setEvents([])
    }
  }, [authenticated, loadAccountData])

  /* ---------- события ---------- */

  const visibleCalendars = useMemo(
    () => calendars.filter((c) => !settings.hiddenCalendarIds.includes(c.id)),
    [calendars, settings.hiddenCalendarIds],
  )

  const range = useMemo(
    () => rangeFor(view, anchor, settings.firstDayOfWeek),
    [view, anchor, settings.firstDayOfWeek],
  )

  const fetchEvents = useCallback(async () => {
    if (!authenticated || visibleCalendars.length === 0) {
      setEvents([])
      return
    }
    const id = ++requestId.current
    setLoading(true)
    // Запас в неделю с каждой стороны — чтобы многодневные события не обрезались.
    const timeMin = addDays(range.start, -7).toISOString()
    const timeMax = addDays(range.end, 7).toISOString()

    try {
      const chunks = await Promise.all(
        visibleCalendars.map((calendar) =>
          ipc
            .listEvents({
              calendarId: calendar.id,
              timeMin,
              timeMax,
              query: query.trim() || undefined,
            })
            .catch(() => [] as CalendarEvent[]),
        ),
      )
      if (id !== requestId.current) return
      setEvents(chunks.flat())
      setSyncedAt(new Date())
    } catch (error) {
      if (id === requestId.current) setNotice({ kind: 'error', text: describe(error) })
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [authenticated, visibleCalendars, range.start, range.end, query])

  useEffect(() => {
    const timer = setTimeout(() => void fetchEvents(), query ? 320 : 0)
    return () => clearTimeout(timer)
  }, [fetchEvents, query])

  // Фоновая синхронизация раз в 5 минут.
  useEffect(() => {
    if (!authenticated) return
    const timer = setInterval(() => void fetchEvents(), 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [authenticated, fetchEvents])

  /* ---------- действия ---------- */

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    try {
      const next = await ipc.setSettings(patch)
      setSettings(next)
    } catch (error) {
      setNotice({ kind: 'error', text: describe(error) })
    }
  }, [])

  const setView = useCallback((next: ViewMode) => setViewState(next), [])

  const signIn = useCallback(async () => {
    try {
      await ipc.signIn()
      await loadAccount()
      setNotice({ kind: 'success', text: 'Аккаунт Google подключён' })
    } catch (error) {
      setNotice({ kind: 'error', text: describe(error) })
    }
  }, [loadAccount])

  const signOut = useCallback(async () => {
    await ipc.signOut()
    await loadAccount()
    setScreen('calendar')
  }, [loadAccount])

  const revoke = useCallback(async () => {
    await ipc.revoke()
    await loadAccount()
    setScreen('calendar')
    setNotice({ kind: 'info', text: 'Доступ к аккаунту Google отозван' })
  }, [loadAccount])

  const saveCredentials = useCallback(
    async (creds: { clientId: string; clientSecret: string }) => {
      await ipc.setCredentials(creds)
      await loadAccount()
    },
    [loadAccount],
  )

  const toggleCalendar = useCallback(
    async (id: string) => {
      const hidden = settings.hiddenCalendarIds.includes(id)
      const next = hidden
        ? settings.hiddenCalendarIds.filter((x) => x !== id)
        : [...settings.hiddenCalendarIds, id]
      await updateSettings({ hiddenCalendarIds: next })
    },
    [settings.hiddenCalendarIds, updateSettings],
  )

  const createEvent = useCallback(
    async (calendarId: string, body: unknown) => {
      await ipc.createEvent(calendarId, body)
      setNotice({ kind: 'success', text: 'Событие создано' })
      await fetchEvents()
    },
    [fetchEvents],
  )

  const updateEvent = useCallback(
    async (calendarId: string, eventId: string, patch: unknown) => {
      await ipc.updateEvent(calendarId, eventId, patch)
      setNotice({ kind: 'success', text: 'Событие обновлено' })
      await fetchEvents()
    },
    [fetchEvents],
  )

  const deleteEvent = useCallback(
    async (calendarId: string, eventId: string) => {
      await ipc.deleteEvent(calendarId, eventId)
      setNotice({ kind: 'info', text: 'Событие удалено' })
      await fetchEvents()
    },
    [fetchEvents],
  )

  const respond = useCallback(
    async (calendarId: string, eventId: string, response: string) => {
      await ipc.respondToEvent(calendarId, eventId, response)
      await fetchEvents()
    },
    [fetchEvents],
  )

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 4200)
    return () => clearTimeout(timer)
  }, [notice])

  const value: AppContextValue = {
    booted,
    hasCredentials,
    authenticated,
    profile,
    session,
    appInfo,
    googleSettings,
    settings,
    updateSettings,
    resolvedTheme,
    calendars,
    visibleCalendars,
    events,
    loading,
    syncedAt,
    screen,
    setScreen,
    view,
    setView,
    anchor,
    setAnchor,
    query,
    setQuery,
    notice,
    setNotice,
    signIn,
    signOut,
    revoke,
    saveCredentials,
    refresh: fetchEvents,
    toggleCalendar,
    createEvent,
    updateEvent,
    deleteEvent,
    respond,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp должен вызываться внутри AppProvider')
  return ctx
}

function describe(error: unknown) {
  if (error instanceof IpcError) {
    switch (error.code) {
      case 'NO_CREDENTIALS':
        return 'Не заданы Client ID и Client Secret'
      case 'TIMEOUT':
        return 'Вход не завершён: истекло время ожидания'
      case 'access_denied':
        return 'Доступ не выдан — вход отменён в браузере'
      case 'REAUTH_REQUIRED':
        return 'Сессия истекла, войдите заново'
      default:
        return error.message || 'Что-то пошло не так'
    }
  }
  return (error as Error)?.message ?? 'Что-то пошло не так'
}
