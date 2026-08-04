import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron'
import * as auth from './auth'
import * as google from './google'
import {
  AppSettings,
  clearCredentials,
  getCredentials,
  getSettings,
  saveCredentials,
  saveSettings,
  storageInfo,
} from './store'

type Handler = (...args: any[]) => unknown

/** Единый конверт ответа: renderer не должен ловить сырые исключения Electron. */
function ok(data: unknown) {
  return { ok: true as const, data }
}
function fail(error: unknown) {
  const err = error as { code?: string; status?: number; message?: string }
  return {
    ok: false as const,
    error: {
      code: err.code ?? (err.status ? `HTTP_${err.status}` : 'UNKNOWN'),
      message: err.message ?? 'Неизвестная ошибка',
    },
  }
}

function handle(channel: string, fn: Handler) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return ok(await fn(...args))
    } catch (error) {
      return fail(error)
    }
  })
}

export function registerIpc(getWindow: () => BrowserWindow | null) {
  /* аккаунт */
  handle('auth:state', async () => ({
    hasCredentials: Boolean(getCredentials().clientId),
    authenticated: auth.isAuthenticated(),
    session: auth.sessionInfo(),
  }))
  handle('auth:signIn', async () => {
    await auth.signIn()
    getWindow()?.focus()
    return auth.sessionInfo()
  })
  handle('auth:signOut', () => auth.signOut())
  handle('auth:revoke', () => auth.revokeAccess())
  handle('auth:profile', () => auth.getProfile())

  /* учётные данные OAuth-клиента */
  handle('credentials:get', () => {
    const { clientId, clientSecret } = getCredentials()
    return { clientId, hasSecret: Boolean(clientSecret) }
  })
  handle('credentials:set', (creds: { clientId: string; clientSecret: string }) => {
    saveCredentials(creds)
    return true
  })
  handle('credentials:clear', () => {
    clearCredentials()
    return true
  })

  /* календарь */
  handle('calendar:list', () => google.listCalendars())
  handle('calendar:setSelected', (id: string, selected: boolean) =>
    google.updateCalendarSelected(id, selected),
  )
  handle('events:list', (args: google.ListEventsArgs) => google.listEvents(args))
  handle('events:create', (calendarId: string, event: Record<string, unknown>) =>
    google.createEvent(calendarId, event),
  )
  handle('events:update', (calendarId: string, eventId: string, patch: Record<string, unknown>) =>
    google.updateEvent(calendarId, eventId, patch),
  )
  handle('events:delete', (calendarId: string, eventId: string) =>
    google.deleteEvent(calendarId, eventId),
  )
  handle('events:respond', (calendarId: string, eventId: string, response: any) =>
    google.respondToEvent(calendarId, eventId, response),
  )
  handle('calendar:colors', () => google.getColors())
  handle('calendar:googleSettings', () => google.getUserSettings())

  /* настройки приложения */
  handle('settings:get', () => getSettings())
  handle('settings:set', (patch: Partial<AppSettings>) => {
    const next = saveSettings(patch)
    if (patch.theme) {
      nativeTheme.themeSource = patch.theme
    }
    return next
  })

  /* системное */
  handle('app:info', () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    locale: app.getLocale(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    storage: storageInfo(),
  }))
  handle('app:openExternal', (url: string) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return true
  })
}
