import { app, safeStorage } from 'electron'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export interface OAuthTokens {
  access_token: string
  refresh_token?: string
  expires_at: number
  scope?: string
  token_type?: string
  id_token?: string
}

export interface Credentials {
  clientId: string
  clientSecret: string
}

export type IconStyle = 'bold' | 'bold-duotone' | 'broken' | 'line-duotone' | 'linear' | 'outline'
export type FontVariant = 'inter' | 'inter-display' | 'inter-tight' | 'inter-variable'

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  defaultView: 'day' | 'week' | 'month' | 'agenda'
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

export const defaultSettings: AppSettings = {
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

function filePath(name: string) {
  return path.join(app.getPath('userData'), name)
}

function readJson<T>(name: string, fallback: T): T {
  try {
    const raw = fs.readFileSync(filePath(name), 'utf8')
    return { ...fallback, ...(JSON.parse(raw) as T) }
  } catch {
    return fallback
  }
}

function writeJson(name: string, value: unknown) {
  fs.mkdirSync(app.getPath('userData'), { recursive: true })
  fs.writeFileSync(filePath(name), JSON.stringify(value, null, 2), 'utf8')
}

/* ---------- локальное шифрование секретов ----------
 * safeStorage держит ключ в связке ключей macOS, а доступ к записи связки
 * привязан к подписи приложения. Мы подписываем ad-hoc (без Apple Developer
 * ID), поэтому каждая пересборка даёт новую подпись — старый шифротекст после
 * неё не расшифровывается, и токен «пропадает». Плюс имя записи в связке
 * зависит от имени приложения, так что переименование ломает её тоже.
 *
 * Поэтому секреты приложения шифруются ключом, который лежит рядом в каталоге
 * данных (0600). Это защита от случайного подглядывания в файл, а не от того,
 * кто уже получил доступ к домашнему каталогу: ключ лежит рядом с данными.
 * Зато секрет переживает пересборки и переименования — ради этого и сделано.
 */

const KEY_FILE = 'secret.key'

interface SealedBox {
  v: 1
  iv: string
  tag: string
  data: string
}

function localKey(): Buffer {
  try {
    const existing = fs.readFileSync(filePath(KEY_FILE))
    if (existing.length === 32) return existing
  } catch {
    /* ключа ещё нет — создаём ниже */
  }
  const key = crypto.randomBytes(32)
  fs.mkdirSync(app.getPath('userData'), { recursive: true })
  fs.writeFileSync(filePath(KEY_FILE), key, { mode: 0o600 })
  return key
}

function seal(plain: string): SealedBox {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', localKey(), iv)
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return {
    v: 1,
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  }
}

function unseal(box: SealedBox | null): string | null {
  if (!box || box.v !== 1 || !box.iv || !box.tag || !box.data) return null
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', localKey(), Buffer.from(box.iv, 'base64'))
    decipher.setAuthTag(Buffer.from(box.tag, 'base64'))
    const plain = Buffer.concat([decipher.update(Buffer.from(box.data, 'base64')), decipher.final()])
    return plain.toString('utf8')
  } catch {
    return null
  }
}

function readSealed(name: string): string | null {
  try {
    return unseal(JSON.parse(fs.readFileSync(filePath(name), 'utf8')) as SealedBox)
  } catch {
    return null
  }
}

function writeSealed(name: string, plain: string) {
  writeJson(name, seal(plain))
}

function removeFile(name: string) {
  try {
    fs.rmSync(filePath(name))
  } catch {
    /* уже удалено */
  }
}

/* ---------- settings ---------- */

export function getSettings(): AppSettings {
  return readJson<AppSettings>('settings.json', defaultSettings)
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...patch }
  writeJson('settings.json', next)
  return next
}

/* ---------- credentials ---------- */

export function getCredentials(): Credentials {
  const fromBuild: Credentials = {
    clientId: process.env.APP_GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.APP_GOOGLE_CLIENT_SECRET || '',
  }
  const stored = readJson<Credentials>('credentials.json', { clientId: '', clientSecret: '' })
  return {
    clientId: stored.clientId || fromBuild.clientId,
    clientSecret: stored.clientSecret || fromBuild.clientSecret,
  }
}

export function saveCredentials(creds: Credentials) {
  writeJson('credentials.json', {
    clientId: creds.clientId.trim(),
    clientSecret: creds.clientSecret.trim(),
  })
}

export function clearCredentials() {
  try {
    fs.rmSync(filePath('credentials.json'))
  } catch {
    /* уже удалено */
  }
}

/* ---------- tokens (шифруются через safeStorage, где доступно) ---------- */

const TOKENS_FILE = 'session.bin'

export function getTokens(): OAuthTokens | null {
  try {
    const raw = fs.readFileSync(filePath(TOKENS_FILE))
    const json = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(raw)
      : raw.toString('utf8')
    return JSON.parse(json) as OAuthTokens
  } catch {
    return null
  }
}

export function saveTokens(tokens: OAuthTokens) {
  fs.mkdirSync(app.getPath('userData'), { recursive: true })
  const json = JSON.stringify(tokens)
  const buf = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(json)
    : Buffer.from(json, 'utf8')
  fs.writeFileSync(filePath(TOKENS_FILE), buf)
}

export function clearTokens() {
  try {
    fs.rmSync(filePath(TOKENS_FILE))
  } catch {
    /* уже удалено */
  }
}

export function storageInfo() {
  return {
    directory: app.getPath('userData'),
    encrypted: safeStorage.isEncryptionAvailable(),
  }
}

/* ---------- Figma: токен ----------
 * Хранится в figma-token.json (см. «локальное шифрование секретов»): вводится
 * один раз и переживает пересборку приложения. figma-token.bin — старый формат
 * на safeStorage; читаем его один раз, если связка ключей ещё отдаёт данные,
 * и сразу переписываем в новый формат.
 */

const FIGMA_TOKEN_FILE = 'figma-token.json'
const FIGMA_TOKEN_LEGACY_FILE = 'figma-token.bin'

function readLegacyFigmaToken(): string | null {
  try {
    const raw = fs.readFileSync(filePath(FIGMA_TOKEN_LEGACY_FILE))
    const token = safeStorage.isEncryptionAvailable()
      ? safeStorage.decryptString(raw)
      : raw.toString('utf8')
    return token.trim() || null
  } catch {
    // Подпись приложения или его имя изменились — связка ключей больше не
    // отдаёт ключ. Восстановить нечего, токен вводится заново.
    return null
  }
}

export function getFigmaToken(): string | null {
  const token = readSealed(FIGMA_TOKEN_FILE)
  if (token) return token

  const legacy = readLegacyFigmaToken()
  if (legacy) {
    saveFigmaToken(legacy)
    removeFile(FIGMA_TOKEN_LEGACY_FILE)
    return legacy
  }
  return null
}

export function saveFigmaToken(token: string) {
  writeSealed(FIGMA_TOKEN_FILE, token.trim())
}

export function clearFigmaToken() {
  removeFile(FIGMA_TOKEN_FILE)
  removeFile(FIGMA_TOKEN_LEGACY_FILE)
}

/* ---------- Figma: профиль подключённого аккаунта ----------
 * Кэшируем ответ /me, чтобы запуск не зависел от сети: без кэша любая сетевая
 * ошибка на старте выглядела бы как «токена нет» и приложение снова просило
 * бы ключ. */

const FIGMA_USER_FILE = 'figma-user.json'

export interface StoredFigmaUser {
  id: string
  email: string
  handle: string
  img_url: string
}

export function getFigmaUser(): StoredFigmaUser | null {
  try {
    const user = JSON.parse(fs.readFileSync(filePath(FIGMA_USER_FILE), 'utf8')) as StoredFigmaUser
    return user?.handle ? user : null
  } catch {
    return null
  }
}

export function saveFigmaUser(user: StoredFigmaUser) {
  writeJson(FIGMA_USER_FILE, user)
}

export function clearFigmaUser() {
  removeFile(FIGMA_USER_FILE)
}

/* ---------- Figma: отслеживаемые команды (Figma API не даёт список команд токена) ---------- */

export interface FigmaTeamRef {
  id: string
  label: string
}

/** Настройки раздела: под них подстраиваются метрики «ночной работы»,
 * «выходных» и глубина синхронизации. У разных команд разный рабочий ритм,
 * поэтому пороги не зашиты в код. */
export interface FigmaPrefs {
  workdayStart: number
  workdayEnd: number
  nightStart: number
  nightEnd: number
  /** Дни недели, считающиеся выходными: 0 — воскресенье, 6 — суббота. */
  weekendDays: number[]
  /** Сколько корзин показывать на таймлайне при каждой гранулярности. */
  timelineBuckets: { day: number; week: number; month: number; year: number }
  /** Потолок страниц истории версий на файл при синхронизации (30 версий/стр). */
  syncDepthPages: number
  /** Параллельных файлов при синхронизации. */
  syncConcurrency: number
  /** Плотность интерфейса раздела. */
  density: 'compact' | 'comfortable'
  /** Раздел, открывающийся первым. */
  defaultSection: string
  /** Показывать таблицу значений вместо графика по умолчанию. */
  tablesByDefault: boolean
  /** Пороги, по которым формулируются авто-инсайты. */
  insightThresholds: {
    staleDays: number
    unansweredDays: number
    concentrationPercent: number
    dropPercent: number
    nightSharePercent: number
  }
  /** Сохранённые наборы фильтров. */
  filterPresets: { id: string; name: string; filters: unknown }[]
  /** Закреплённые файлы — быстрый доступ в сайдбаре. */
  pinnedFiles: { key: string; name: string }[]
}

export const defaultFigmaPrefs: FigmaPrefs = {
  workdayStart: 9,
  workdayEnd: 19,
  nightStart: 22,
  nightEnd: 7,
  weekendDays: [0, 6],
  timelineBuckets: { day: 30, week: 12, month: 12, year: 5 },
  syncDepthPages: 400,
  syncConcurrency: 4,
  density: 'comfortable',
  defaultSection: 'dashboard',
  tablesByDefault: false,
  insightThresholds: {
    staleDays: 45,
    unansweredDays: 7,
    concentrationPercent: 55,
    dropPercent: 25,
    nightSharePercent: 25,
  },
  filterPresets: [],
  pinnedFiles: [],
}

interface FigmaSettings {
  teams: FigmaTeamRef[]
  /** Участники, скрытые из аналитики вручную: подрядчики, боты, люди из
   * соседних команд, попавшие в файлы через шаринг. */
  hiddenUsers: string[]
  prefs: FigmaPrefs
}

const FIGMA_SETTINGS_FILE = 'figma-settings.json'
const defaultFigmaSettings: FigmaSettings = { teams: [], hiddenUsers: [], prefs: defaultFigmaPrefs }

function readFigmaSettings(): FigmaSettings {
  const stored = readJson<FigmaSettings>(FIGMA_SETTINGS_FILE, defaultFigmaSettings)
  return {
    teams: stored.teams ?? [],
    hiddenUsers: stored.hiddenUsers ?? [],
    prefs: {
      ...defaultFigmaPrefs,
      ...(stored.prefs ?? {}),
      timelineBuckets: { ...defaultFigmaPrefs.timelineBuckets, ...(stored.prefs?.timelineBuckets ?? {}) },
      insightThresholds: {
        ...defaultFigmaPrefs.insightThresholds,
        ...(stored.prefs?.insightThresholds ?? {}),
      },
      filterPresets: stored.prefs?.filterPresets ?? [],
      pinnedFiles: stored.prefs?.pinnedFiles ?? [],
    },
  }
}

export function getFigmaPrefs(): FigmaPrefs {
  return readFigmaSettings().prefs
}

export function saveFigmaPrefs(patch: Partial<FigmaPrefs>): FigmaPrefs {
  const settings = readFigmaSettings()
  const prefs: FigmaPrefs = {
    ...settings.prefs,
    ...patch,
    timelineBuckets: { ...settings.prefs.timelineBuckets, ...(patch.timelineBuckets ?? {}) },
    insightThresholds: { ...settings.prefs.insightThresholds, ...(patch.insightThresholds ?? {}) },
  }
  writeJson(FIGMA_SETTINGS_FILE, { ...settings, prefs })
  return prefs
}

export function getFigmaTeams(): FigmaTeamRef[] {
  return readFigmaSettings().teams
}

export function saveFigmaTeams(teams: FigmaTeamRef[]) {
  // Пишем поверх прочитанного целиком, иначе перезапись файла затрёт список
  // скрытых участников, который живёт в том же файле.
  writeJson(FIGMA_SETTINGS_FILE, { ...readFigmaSettings(), teams })
  return teams
}

export function getFigmaHiddenUsers(): string[] {
  return readFigmaSettings().hiddenUsers
}

export function saveFigmaHiddenUsers(hiddenUsers: string[]) {
  writeJson(FIGMA_SETTINGS_FILE, { ...readFigmaSettings(), hiddenUsers })
  return hiddenUsers
}

/* ---------- Figma: дисковый кэш (проекты/файлы/версии/комментарии) ----------
 * Цель — не бить лишний раз по API и не терять историю при перезапуске: при
 * большом пространстве (десятки проектов, тысячи версий/комментариев) кэш
 * читается с диска мгновенно, а сеть используется только для добора свежего
 * "хвоста" поверх уже сохранённого.
 */

export interface FigmaFileCache {
  meta: unknown
  versions: unknown[]
  versionsCursor: string | null
  comments: unknown[]
  fetchedAt: number
  /** Откуда файл — нужно, чтобы события можно было группировать по проекту/команде. */
  fileName?: string
  projectId?: string
  projectName?: string
  teamId?: string
  teamName?: string
  /** last_modified файла на момент последней выкачки истории: пока он не
   * изменился, перечитывать версии незачем — новых сохранений не было. */
  lastModified?: string
  /** true — вся история версий выкачана до конца (курсор исчерпан). */
  versionsComplete?: boolean
}

export interface FigmaLibraryCache {
  data: unknown
  fetchedAt: number
}

interface FigmaCacheShape {
  projectsByTeam: Record<string, unknown[]>
  filesByProject: Record<string, unknown[]>
  files: Record<string, FigmaFileCache>
  libraryByTeam: Record<string, FigmaLibraryCache>
}

const FIGMA_CACHE_FILE = 'figma-cache.json'
const emptyFigmaCache: FigmaCacheShape = {
  projectsByTeam: {},
  filesByProject: {},
  files: {},
  libraryByTeam: {},
}

/* Кэш живёт в памяти, а на диск сбрасывается отложенно. Синхронизация трогает
 * его дважды на каждый файл, и при разборе/сериализации 11 МБ JSON на каждое
 * обращение она упиралась не в сеть, а в диск — время росло квадратично от
 * объёма уже собранной истории. Main-процесс однопоточный и единственный
 * владелец кэша, так что работа с общим объектом в памяти безопасна. */

let memoryCache: FigmaCacheShape | null = null
let flushTimer: NodeJS.Timeout | null = null

const FLUSH_DELAY_MS = 2000

export function readFigmaCache(): FigmaCacheShape {
  if (!memoryCache) memoryCache = readJson<FigmaCacheShape>(FIGMA_CACHE_FILE, emptyFigmaCache)
  return memoryCache
}

/** Немедленная запись — на выходе из приложения и по окончании синхронизации. */
export function flushFigmaCache() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  if (memoryCache) writeJson(FIGMA_CACHE_FILE, memoryCache)
}

export function writeFigmaCache(cache: FigmaCacheShape) {
  memoryCache = cache
  if (flushTimer) return
  flushTimer = setTimeout(() => {
    flushTimer = null
    if (memoryCache) writeJson(FIGMA_CACHE_FILE, memoryCache)
  }, FLUSH_DELAY_MS)
  // Таймер не должен держать процесс живым дольше нужного.
  flushTimer.unref?.()
}
