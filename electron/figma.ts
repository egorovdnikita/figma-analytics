import { getFigmaToken } from './store'

const ORIGIN = 'https://api.figma.com'
const BASE = `${ORIGIN}/v1`

export class FigmaApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/* ---------- бюджет запросов ----------
 * Figma считает лимит поминутно и по «тарифу» эндпоинта: 10/мин на тяжёлые
 * файловые запросы, 25/мин на историю версий и комментарии, 50/мин на
 * метаданные и библиотеку (это потолки для Dev/Full-мест, у View/Collab ниже).
 *
 * Раньше пауза была одна на все запросы и подбиралась вслепую: старт со 120 мс
 * — это 500 запросов в минуту, то есть гарантированный 429 через несколько
 * секунд, кулдаун, робкое ускорение и снова 429. Синхронизация проводила в
 * ожидании снятия лимита больше времени, чем в работе. Теперь у каждого тарифа
 * свой бюджет и скользящее окно в минуту: идём ровно в темпе, который Figma
 * разрешает, и 429 перестаёт быть штатным режимом.
 */
export type FigmaTier = 1 | 2 | 3

const TIER_BUDGET: Record<FigmaTier, number> = { 1: 10, 2: 25, 3: 50 }
const WINDOW_MS = 60_000
/** Зазор на расхождение часов: окно лучше считать чуть шире, чем ровно минуту. */
const WINDOW_SLACK_MS = 750
/** Потолок ожидания после 429, если Figma не прислала Retry-After. */
const MAX_COOLDOWN_MS = 60_000

/** Действующий бюджет: стартуем с документированного и ужимаем, если Figma всё
 * равно отвечает 429 — у View/Collab-мест потолки в разы ниже. */
const budget: Record<FigmaTier, number> = { ...TIER_BUDGET }
const recent: Record<FigmaTier, number[]> = { 1: [], 2: [], 3: [] }
const queues: Record<FigmaTier, Promise<void>> = {
  1: Promise.resolve(),
  2: Promise.resolve(),
  3: Promise.resolve(),
}

let cooldownUntil = 0

function tierOf(pathname: string): FigmaTier {
  if (/\/(components|component_sets|styles)\b/.test(pathname)) return 3
  if (/\/me\b/.test(pathname) || /\/meta\b/.test(pathname)) return 3
  if (/\/(versions|comments)\b/.test(pathname) || pathname.startsWith('/v2/')) return 2
  return 1
}

function nextSlotDelay(tier: FigmaTier): number {
  const now = Date.now()
  const window = recent[tier]
  while (window.length > 0 && now - window[0] > WINDOW_MS) window.shift()

  const cooldown = Math.max(0, cooldownUntil - now)
  if (window.length < budget[tier]) return cooldown
  return Math.max(cooldown, window[0] + WINDOW_MS + WINDOW_SLACK_MS - now)
}

/** Ждёт слот в пределах своего тарифа. Очередь у каждого тарифа своя: дешёвые
 * метаданные не должны стоять за тяжёлыми файловыми запросами. */
function reserveSlot(tier: FigmaTier): Promise<void> {
  const ticket = queues[tier].then(async () => {
    for (;;) {
      const wait = nextSlotDelay(tier)
      if (wait <= 0) break
      await sleep(Math.min(wait, WINDOW_MS))
    }
    recent[tier].push(Date.now())
  })
  queues[tier] = ticket.catch(() => {})
  return ticket
}

function startCooldown(ms: number) {
  cooldownUntil = Math.max(cooldownUntil, Date.now() + Math.min(ms, MAX_COOLDOWN_MS))
}

/** 429 при соблюдённом бюджете значит, что у места лимит ниже документированного. */
function tightenBudget(tier: FigmaTier) {
  budget[tier] = Math.max(3, Math.floor(budget[tier] / 2))
}

/** Сколько сейчас ждать очередь — рендерер показывает это в прогрессе синка. */
export function rateLimitDelayMs(): number {
  return Math.max(0, cooldownUntil - Date.now())
}

/* Ретраев на 429 больше, чем на 5xx: упереться в лимит на середине синка
 * дороже, чем подождать. Ожидание общее, так что повторы не множат нагрузку. */
const MAX_ATTEMPTS_RATE_LIMIT = 10
const MAX_ATTEMPTS_SERVER = 6
/** Обрыв соединения — не отказ Figma, а помеха по дороге: на длинном синке
 * (сотни запросов подряд, тяжёлые ответы по комментариям) отдельные сокеты
 * рвутся всегда. Раньше такой обрыв сразу убивал файл — «неизвестная ошибка». */
const MAX_ATTEMPTS_NETWORK = 4

/** Разворачивает undici-обёртку: у fetch сообщение всегда «fetch failed», а
 * настоящая причина (ECONNRESET, таймаут заголовков, DNS) лежит в cause. */
function networkMessage(error: unknown): string {
  const cause = (error as { cause?: { code?: string; message?: string } }).cause
  const detail = cause?.code ?? cause?.message
  const base = (error as Error).message || 'сетевая ошибка'
  return detail ? `${base}: ${detail}` : base
}

async function api<T>(pathname: string, attempt = 0): Promise<T> {
  const token = getFigmaToken()
  if (!token) throw new FigmaApiError(401, 'Figma не подключена: не задан personal access token')

  const tier = tierOf(pathname)
  await reserveSlot(tier)

  // Пути к v2 передаются целиком («/v2/...»), остальное живёт в v1.
  const url = pathname.startsWith('http')
    ? pathname
    : pathname.startsWith('/v2/')
      ? `${ORIGIN}${pathname}`
      : `${BASE}${pathname}`
  let res: Response
  try {
    res = await fetch(url, { headers: { 'X-Figma-Token': token } })
  } catch (error) {
    if (attempt < MAX_ATTEMPTS_NETWORK) {
      await sleep(Math.min(1000 * 2 ** attempt, 15_000))
      return api<T>(pathname, attempt + 1)
    }
    // status 0 — «ответа не было вовсе», это не то же самое, что отказ Figma.
    throw new FigmaApiError(0, networkMessage(error))
  }

  const limit = res.status === 429
  if (limit) tightenBudget(tier)

  if ((limit || res.status >= 500) && attempt < (limit ? MAX_ATTEMPTS_RATE_LIMIT : MAX_ATTEMPTS_SERVER)) {
    const retryAfter = Number(res.headers.get('retry-after'))
    const wait =
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt
    if (limit) startCooldown(wait)
    else await sleep(Math.min(wait, 30_000))
    return api<T>(pathname, attempt + 1)
  }
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = (await res.json()) as { message?: string; err?: string }
      message = body.message ?? body.err ?? message
    } catch {
      /* тело не JSON */
    }
    throw new FigmaApiError(res.status, message)
  }
  return (await res.json()) as T
}

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  return search.toString()
}

/* ---------- аккаунт ---------- */

export interface FigmaUser {
  id: string
  email: string
  handle: string
  img_url: string
}

export function verifyToken() {
  return api<FigmaUser>('/me')
}

/* ---------- команды / проекты / файлы ---------- */

export interface FigmaProject {
  id: string
  name: string
}

/** Figma переименовала «проекты» в «папки» и вынесла их в v2. Старый
 * /v1/teams/:id/projects требует scope projects:read, который объявлен
 * устаревшим и новым токенам уже не выдаётся — поэтому сначала пробуем v2, а на
 * v1 откатываемся ради токенов, выпущенных до этого перехода.
 *
 * Формы ответа у v2 разбираем терпимо: важно только то, что нужно дальше — id и
 * имя. */
export async function listTeamProjects(teamId: string): Promise<{ name: string; projects: FigmaProject[] }> {
  try {
    const data = await api<{ name?: string; folders?: FigmaProject[] } | FigmaProject[]>(
      `/v2/teams/${encodeURIComponent(teamId)}/folders`,
    )
    const folders = Array.isArray(data) ? data : data.folders
    const teamName = Array.isArray(data) ? '' : (data.name ?? '')
    // Пустой список папок — законный ответ, а вот незнакомая форма ответа не
    // должна тихо превращаться в «синхронизировать нечего».
    if (!folders) throw new FigmaApiError(500, 'Неожиданный ответ /v2/teams/:id/folders')
    return { name: teamName, projects: folders.map((folder) => ({ id: folder.id, name: folder.name })) }
  } catch (error) {
    if (!(error instanceof FigmaApiError) || error.status !== 403) throw error
    return api<{ name: string; projects: FigmaProject[] }>(`/teams/${encodeURIComponent(teamId)}/projects`)
  }
}

export interface FigmaFileSummary {
  key: string
  name: string
  thumbnail_url?: string
  last_modified: string
}

/** То же самое для файлов внутри папки: v2 сначала, v1 как запасной путь.
 * Ключ времени изменения в v2 может приехать в camelCase — нормализуем, иначе
 * инкрементальный синк перестанет узнавать неизменившиеся файлы. */
export async function listProjectFiles(projectId: string): Promise<{ name: string; files: FigmaFileSummary[] }> {
  try {
    const data = await api<{ files?: RawFileSummary[] } | RawFileSummary[]>(
      `/v2/folders/${encodeURIComponent(projectId)}/files`,
    )
    const files = Array.isArray(data) ? data : data.files
    if (!files) throw new FigmaApiError(500, 'Неожиданный ответ /v2/folders/:id/files')
    return { name: '', files: files.map(normaliseFile) }
  } catch (error) {
    if (!(error instanceof FigmaApiError) || error.status !== 403) throw error
    return api<{ name: string; files: FigmaFileSummary[] }>(`/projects/${encodeURIComponent(projectId)}/files`)
  }
}

interface RawFileSummary extends Omit<FigmaFileSummary, 'last_modified'> {
  last_modified?: string
  lastModified?: string
}

function normaliseFile(file: RawFileSummary): FigmaFileSummary {
  return {
    key: file.key,
    name: file.name,
    thumbnail_url: file.thumbnail_url,
    last_modified: file.last_modified ?? file.lastModified ?? '',
  }
}

export interface FigmaFileMeta {
  name: string
  lastModified: string
  thumbnailUrl?: string
  version: string
  role: string
  editorType?: string
}

export function getFile(fileKey: string) {
  return api<FigmaFileMeta>(`/files/${encodeURIComponent(fileKey)}?depth=1`)
}

/* ---------- версии (история сохранений) ---------- */

/** Лёгкая проверка «менялся ли файл»: тариф 3 (50 запросов в минуту против 25
 * у истории версий), в ответе есть время последнего изменения. Нужна там, где
 * список папок недоступен и взять last_modified больше неоткуда. */
export async function getFileTouchedAt(fileKey: string) {
  const data = await api<{ file?: { last_touched_at?: string; folder_name?: string } }>(
    `/files/${encodeURIComponent(fileKey)}/meta`,
  )
  return {
    lastModified: data.file?.last_touched_at ?? '',
    folderName: data.file?.folder_name ?? '',
  }
}

export interface FigmaVersion {
  id: string
  created_at: string
  label: string | null
  description: string | null
  user: { id: string; handle: string; img_url: string }
}

export interface FigmaVersionsPage {
  versions: FigmaVersion[]
  nextCursor: string | null
}

/** cursor — либо undefined (первая страница), либо полный URL из предыдущего
 * ответа (pagination.next_page) — так и курсорная пагинация Figma устроена. */
export async function getFileVersions(fileKey: string, cursor?: string): Promise<FigmaVersionsPage> {
  const url = cursor ?? `/files/${encodeURIComponent(fileKey)}/versions?${qs({ page_size: 30 })}`
  const page = await api<{
    versions: FigmaVersion[]
    pagination?: { next_page?: string | null }
  }>(url)
  return { versions: page.versions, nextCursor: page.pagination?.next_page ?? null }
}

/* ---------- комментарии ---------- */

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
  /** Якорь комментария на холсте — есть только у корневых, у ответов null. */
  client_meta: { node_id?: string; node_offset?: { x: number; y: number } } | null
}

export function getFileComments(fileKey: string) {
  return api<{ comments: FigmaComment[] }>(`/files/${encodeURIComponent(fileKey)}/comments`)
}

/* ---------- библиотека команды (опубликованные компоненты/стили) ---------- */

export interface FigmaLibraryItem {
  key: string
  name: string
  description: string
  created_at: string
  updated_at: string
  user: { id: string; handle: string; img_url: string }
  containing_frame?: { pageName?: string; name?: string }
  file_key?: string
}

interface LibraryPage<T> {
  meta: { components?: T[]; component_sets?: T[]; styles?: T[] }
}

export async function getTeamComponents(teamId: string) {
  const page = await api<LibraryPage<FigmaLibraryItem>>(
    `/teams/${encodeURIComponent(teamId)}/components?${qs({ page_size: 100 })}`,
  )
  return page.meta.components ?? []
}

export async function getTeamComponentSets(teamId: string) {
  const page = await api<LibraryPage<FigmaLibraryItem>>(
    `/teams/${encodeURIComponent(teamId)}/component_sets?${qs({ page_size: 100 })}`,
  )
  return page.meta.component_sets ?? []
}

export async function getTeamStyles(teamId: string) {
  const page = await api<LibraryPage<FigmaLibraryItem>>(
    `/teams/${encodeURIComponent(teamId)}/styles?${qs({ page_size: 100 })}`,
  )
  return page.meta.styles ?? []
}
