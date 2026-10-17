import { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } from 'electron'
import fs from 'node:fs'
import * as auth from './auth'
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
  getFigmaLastSyncAt,
  getFigmaToken,
  getFigmaUser,
  getSettings,
  saveCredentials,
  saveFigmaLastSyncAt,
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
  handle('figma:teams:add', (id: string, label: string, kind: 'team' | 'project' = 'team') =>
    figmaCache.addTeam(id, label, kind),
  )
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
    /** Запущена планировщиком, а не кнопкой: экран показывает это тише. */
    auto: boolean
  }
  let session: SyncSession | null = null
  let lastResult: (figmaCache.SyncResult & { startedAt: number; auto: boolean }) | null = null

  const broadcast = (channel: string, payload: unknown) => {
    for (const window of BrowserWindow.getAllWindows()) window.webContents.send(channel, payload)
  }

  /** Единственная точка запуска: и кнопка, и планировщик идут сюда, поэтому
   * второй синк поверх первого не стартует ни при каком сочетании. */
  function startSync(auto: boolean) {
    if (session) return session.promise

    const startedAt = Date.now()
    const current: SyncSession = {
      startedAt,
      auto,
      progress: { phase: 'projects', done: 0, total: 0, current: '', rateLimitMs: 0 },
      promise: Promise.resolve() as unknown as Promise<figmaCache.SyncResult>,
    }
    current.promise = figmaCache
      .syncAll((progress) => {
        current.progress = progress
        broadcast('figma:syncProgress', progress)
      })
      .then((result) => {
        lastResult = { ...result, startedAt, auto }
        return result
      })
      .finally(() => {
        session = null
        // Отсчёт следующего автообновления идёт от конца попытки, а не от
        // успеха: иначе упёршийся в лимит Figma синк повторялся бы без паузы.
        saveFigmaLastSyncAt(Date.now())
        broadcast('figma:syncDone', lastResult)
      })

    session = current
    // Экран узнаёт о фоновом синке только отсюда — сам он его не начинал.
    broadcast('figma:syncStarted', { startedAt, auto })
    return current.promise
  }

  handle('figma:sync', () => startSync(false))

  /** Экран спрашивает это при открытии: если синк идёт, он подхватит прогресс,
   * а не покажет кнопку «Синхронизировать» поверх работающего обхода. */
  handle('figma:syncState', () => ({
    running: Boolean(session),
    auto: session?.auto ?? false,
    progress: session?.progress ?? null,
    startedAt: session?.startedAt ?? null,
    lastSyncAt: getFigmaLastSyncAt() || null,
    nextAutoSyncAt: nextAutoSyncAt(),
    lastResult,
  }))

  handle('figma:syncStop', () => {
    if (session) figmaCache.requestSyncStop()
    return true
  })

  /* Фоновое обновление.
   *
   * Тикаем часто, а решение принимаем по времени последнего синка: таймер на
   * весь интервал пришлось бы пересоздавать при каждой смене настройки, и он
   * всё равно врал бы после сна компьютера — setTimeout на час его не
   * переживает, а сравнение меток времени переживает. */
  const SCHEDULER_TICK_MS = 60_000

  function nextAutoSyncAt(): number | null {
    const minutes = getFigmaPrefs().autoSyncMinutes
    if (!minutes) return null
    const last = getFigmaLastSyncAt()
    // Без единого синка в истории ждать целый интервал незачем.
    if (!last) return Date.now()
    return last + minutes * 60_000
  }

  function autoSyncTick() {
    if (session) return
    const due = nextAutoSyncAt()
    if (due === null || Date.now() < due) return
    // Нечего и некого обходить — тихо ждём дальше, без ошибок на экране.
    if (!getFigmaToken() || figmaCache.listTeams().length === 0) return
    void startSync(true).catch(() => {
      /* ошибки уже разложены по причинам в результате синка */
    })
  }

  const scheduler = setInterval(autoSyncTick, SCHEDULER_TICK_MS)
  scheduler.unref?.()
  // Первая проверка — вскоре после запуска, когда окно уже готово слушать
  // прогресс, но пользователь ещё не успел ничего нажать.
  const firstCheck = setTimeout(autoSyncTick, 15_000)
  firstCheck.unref?.()

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
