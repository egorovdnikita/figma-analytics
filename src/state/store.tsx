import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { ipc, IpcError } from '@/lib/ipc'
import type { AppInfo, AppSettings, Profile, SessionInfo } from '@/types'

export type Screen = 'figma' | 'profile' | 'calendar' | 'mail' | 'drive' | 'tasks'
type Notice = { kind: 'info' | 'error' | 'success'; text: string } | null

/** Раздел, который открывается по умолчанию: Figma — единственный, где есть
 * содержимое, остальные пока заглушки. */
const HOME_SCREEN: Screen = 'figma'

const defaultSettings: AppSettings = {
  theme: 'system',
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

  settings: AppSettings
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>
  resolvedTheme: 'light' | 'dark'

  screen: Screen
  setScreen: (screen: Screen) => void

  notice: Notice
  setNotice: (notice: Notice) => void

  signIn: () => Promise<void>
  signOut: () => Promise<void>
  revoke: () => Promise<void>
  saveCredentials: (creds: { clientId: string; clientSecret: string }) => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [booted, setBooted] = useState(false)
  const [hasCredentials, setHasCredentials] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null)

  const [settings, setSettings] = useState<AppSettings>(defaultSettings)
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  const [screen, setScreen] = useState<Screen>(HOME_SCREEN)
  const [notice, setNotice] = useState<Notice>(null)

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

  /* ---------- профиль аккаунта ---------- */

  const loadProfile = useCallback(async () => {
    try {
      setProfile(await ipc.profile())
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
    if (authenticated) void loadProfile()
    else setProfile(null)
  }, [authenticated, loadProfile])

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
    setScreen(HOME_SCREEN)
  }, [loadAccount])

  const revoke = useCallback(async () => {
    await ipc.revoke()
    await loadAccount()
    setScreen(HOME_SCREEN)
    setNotice({ kind: 'info', text: 'Доступ к аккаунту Google отозван' })
  }, [loadAccount])

  const saveCredentials = useCallback(
    async (creds: { clientId: string; clientSecret: string }) => {
      await ipc.setCredentials(creds)
      await loadAccount()
    },
    [loadAccount],
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
    settings,
    updateSettings,
    resolvedTheme,
    screen,
    setScreen,
    notice,
    setNotice,
    signIn,
    signOut,
    revoke,
    saveCredentials,
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
