import { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } from 'electron'
import fs from 'node:fs'
import * as auth from './auth'
import * as google from './google'
import * as figma from './figma'
import * as figmaCache from './figmaCache'
import {
  AppSettings,
  FigmaPrefs,
  clearCredentials,
  clearFigmaToken,
  clearFigmaUser,
  getCredentials,
  getFigmaPrefs,
  getFigmaToken,
  getFigmaUser,
  getSettings,
  saveCredentials,
  saveFigmaPrefs,
  saveFigmaToken,
  saveFigmaUser,
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

  /** Токен отзывается только самим Figma: 401/403 — единственный ответ, после
   * которого сохранённый токен считается негодным. Сетевая ошибка, 429 или 5xx
   * ничего не говорят о токене, и ронять из-за них подключение нельзя. */
  const tokenRejected = (error: unknown) => {
    const status = (error as { status?: number }).status
    return status === 401 || status === 403
  }

  handle('figma:status', async () => {
    const token = getFigmaToken()
    if (!token) return { connected: false, user: null }

    // Профиль уже известен — открываемся сразу, без похода в сеть. Проверку
    // токена делаем в фоне: если Figma его отозвала, следующий запуск покажет
    // экран подключения, а текущая сессия сообщит об этом ошибкой запроса.
    const cached = getFigmaUser()
    if (cached) {
      void figma
        .verifyToken()
        .then((user) => saveFigmaUser(user))
        .catch((error) => {
          if (!tokenRejected(error)) return
          clearFigmaToken()
          clearFigmaUser()
        })
      return { connected: true, user: cached }
    }

    try {
      const user = await figma.verifyToken()
      saveFigmaUser(user)
      return { connected: true, user }
    } catch (error) {
      if (tokenRejected(error)) {
        clearFigmaToken()
        clearFigmaUser()
        return { connected: false, user: null }
      }
      // Токен на месте, но проверить его сейчас нельзя (нет сети, лимит API).
      // Пускаем в приложение: данные читаются из локального кэша.
      return { connected: true, user: null }
    }
  })
  handle('figma:setToken', async (token: string) => {
    const trimmed = token.trim()
    if (!trimmed) throw { code: 'FIGMA_TOKEN_EMPTY', message: 'Введите personal access token' }
    saveFigmaToken(trimmed) // сохраняем до проверки, verifyToken читает токен из store
    try {
      const user = await figma.verifyToken()
      saveFigmaUser(user)
      return user
    } catch (error) {
      // Не стираем токен из-за обрыва сети — иначе его пришлось бы вводить снова.
      if (tokenRejected(error)) {
        clearFigmaToken()
        clearFigmaUser()
      }
      throw error
    }
  })
  handle('figma:clearToken', () => {
    clearFigmaToken()
    clearFigmaUser()
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
  handle('figma:teamLibrary', (teamId: string) => figmaCache.getTeamLibrary(teamId))
  handle('figma:events', () => figmaCache.buildEvents())
  handle('figma:fileIndex', () => figmaCache.fileIndex())
  handle('figma:peopleDirectory', () => figmaCache.peopleDirectory())
  handle('figma:hiddenUsers', () => figmaCache.listHiddenUsers())
  handle('figma:setHiddenUsers', (handles: string[]) => figmaCache.setHiddenUsers(handles))
  handle('figma:prefs', () => getFigmaPrefs())
  handle('figma:setPrefs', (patch: Partial<FigmaPrefs>) => saveFigmaPrefs(patch))
  handle('figma:cacheStats', () => figmaCache.cacheStats())
  handle('figma:clearCache', () => figmaCache.clearCache())
  handle('figma:exportCsv', async () => {
    const window = getWindow()
    const result = await dialog.showSaveDialog(window ?? undefined!, {
      title: 'Выгрузить события Figma',
      defaultPath: `figma-events-${new Date().toISOString().slice(0, 10)}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    })
    if (result.canceled || !result.filePath) return { saved: false, path: null }
    fs.writeFileSync(result.filePath, figmaCache.exportEventsCsv(), 'utf8')
    return { saved: true, path: result.filePath }
  })
  /* Синхронизация принадлежит main-процессу, а не экрану.
   *
   * Раньше её состояние жило в компоненте: уход в другой раздел размонтировал
   * его, прогресс пропадал, кнопка возвращалась в исходное положение — а сам
   * обход продолжался вслепую, и повторное нажатие запускало второй такой же
   * поверх первого. Теперь сессия одна на приложение: параллельный запрос
   * подключается к текущей, а вернувшийся экран забирает состояние как есть. */
  interface SyncSession {
    promise: Promise<figmaCache.SyncResult>
    progress: figmaCache.SyncProgress
    startedAt: number
  }
  let session: SyncSession | null = null
  let lastResult: (figmaCache.SyncResult & { startedAt: number }) | null = null

  const broadcast = (channel: string, payload: unknown) => {
    for (const window of BrowserWindow.getAllWindows()) window.webContents.send(channel, payload)
  }

  handle('figma:sync', () => {
    if (session) return session.promise

    const startedAt = Date.now()
    const current: SyncSession = {
      startedAt,
      progress: { phase: 'projects', done: 0, total: 0, current: '', rateLimitMs: 0 },
      promise: Promise.resolve() as unknown as Promise<figmaCache.SyncResult>,
    }
    current.promise = figmaCache
      .syncAll((progress) => {
        current.progress = progress
        broadcast('figma:syncProgress', progress)
      })
      .then((result) => {
        lastResult = { ...result, startedAt }
        return result
      })
      .finally(() => {
        session = null
        broadcast('figma:syncDone', lastResult)
      })

    session = current
    return current.promise
  })

  /** Экран спрашивает это при открытии: если синк идёт, он подхватит прогресс,
   * а не покажет кнопку «Синхронизировать» поверх работающего обхода. */
  handle('figma:syncState', () => ({
    running: Boolean(session),
    progress: session?.progress ?? null,
    startedAt: session?.startedAt ?? null,
    lastResult,
  }))

  handle('figma:syncStop', () => {
    if (session) figmaCache.requestSyncStop()
    return true
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
