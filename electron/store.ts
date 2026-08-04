import { app, safeStorage } from 'electron'
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
    clientId: process.env.BOXUI_GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.BOXUI_GOOGLE_CLIENT_SECRET || '',
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

/* ---------- Figma: токен (шифруется через safeStorage) ---------- */

const FIGMA_TOKEN_FILE = 'figma-token.bin'

export function getFigmaToken(): string | null {
  try {
    const raw = fs.readFileSync(filePath(FIGMA_TOKEN_FILE))
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(raw) : raw.toString('utf8')
  } catch {
    return null
  }
}

export function saveFigmaToken(token: string) {
  fs.mkdirSync(app.getPath('userData'), { recursive: true })
  const trimmed = token.trim()
  const buf = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(trimmed)
    : Buffer.from(trimmed, 'utf8')
  fs.writeFileSync(filePath(FIGMA_TOKEN_FILE), buf)
}

export function clearFigmaToken() {
  try {
    fs.rmSync(filePath(FIGMA_TOKEN_FILE))
  } catch {
    /* уже удалено */
  }
}

/* ---------- Figma: отслеживаемые команды (Figma API не даёт список команд токена) ---------- */

export interface FigmaTeamRef {
  id: string
  label: string
}

export function getFigmaTeams(): FigmaTeamRef[] {
  return readJson<{ teams: FigmaTeamRef[] }>('figma-settings.json', { teams: [] }).teams
}

export function saveFigmaTeams(teams: FigmaTeamRef[]) {
  writeJson('figma-settings.json', { teams })
  return teams
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
}

interface FigmaCacheShape {
  projectsByTeam: Record<string, unknown[]>
  filesByProject: Record<string, unknown[]>
  files: Record<string, FigmaFileCache>
}

const FIGMA_CACHE_FILE = 'figma-cache.json'
const emptyFigmaCache: FigmaCacheShape = { projectsByTeam: {}, filesByProject: {}, files: {} }

export function readFigmaCache(): FigmaCacheShape {
  return readJson<FigmaCacheShape>(FIGMA_CACHE_FILE, emptyFigmaCache)
}

export function writeFigmaCache(cache: FigmaCacheShape) {
  writeJson(FIGMA_CACHE_FILE, cache)
}
