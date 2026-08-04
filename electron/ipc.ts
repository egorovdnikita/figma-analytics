import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron'
import * as auth from './auth'
import * as google from './google'
import * as figma from './figma'
import * as figmaCache from './figmaCache'
import {
  AppSettings,
  clearCredentials,
  clearFigmaToken,
  getCredentials,
  getFigmaToken,
  getSettings,
  saveCredentials,
  saveFigmaToken,
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

  /* Figma */
  handle('figma:status', async () => {
    const token = getFigmaToken()
    if (!token) return { connected: false, user: null }
    try {
      const user = await figma.verifyToken()
      return { connected: true, user }
    } catch {
      return { connected: false, user: null }
    }
  })
  handle('figma:setToken', async (token: string) => {
    const trimmed = token.trim()
    if (!trimmed) throw { code: 'FIGMA_TOKEN_EMPTY', message: 'Введите personal access token' }
    saveFigmaToken(trimmed) // сохраняем до проверки, verifyToken читает токен из store
    try {
      const user = await figma.verifyToken()
      return user
    } catch (error) {
      clearFigmaToken()
      throw error
    }
  })
  handle('figma:clearToken', () => {
    clearFigmaToken()
    return true
  })

  handle('figma:teams:list', () => figmaCache.listTeams())
  handle('figma:teams:add', (id: string, label: string) => figmaCache.addTeam(id, label))
  handle('figma:teams:remove', (id: string) => figmaCache.removeTeam(id))

  handle('figma:projects', (teamId: string) => figmaCache.listProjects(teamId))
  handle('figma:files', (projectId: string) => figmaCache.listFiles(projectId))
  handle('figma:file', (fileKey: string) => figmaCache.getFileMeta(fileKey))
  handle('figma:versions', (fileKey: string, offset: number, limit: number) =>
    figmaCache.getVersions(fileKey, offset, limit),
  )
  handle('figma:comments', (fileKey: string, offset: number, limit: number) =>
    figmaCache.getComments(fileKey, offset, limit),
  )
  handle('figma:overview', () => figmaCache.overviewSnapshot())

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
