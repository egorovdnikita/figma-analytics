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

/* ---------- общий ограничитель запросов ----------
 * Лимит Figma считается на аккаунт, а не на соединение, поэтому тормозить
 * нужно все запросы разом. Раньше бэкофф был локальным: воркер, поймавший 429,
 * ждал, а остальные продолжали долбить тот же лимит — в итоге на глубокой
 * выкачке истории 429 получали все и синк заканчивался сотней «непрочитанных»
 * файлов. Теперь выдача слотов на запрос общая: между запросами держим паузу,
 * а полученный 429 останавливает всю очередь до конца кулдауна.
 */

/** Пауза между любыми двумя запросами: подбирается на ходу. Свой лимит Figma
 * не публикует и считает его по стоимости endpoint'а, поэтому единственный
 * честный способ попасть в темп — замедляться на 429 и потихоньку ускоряться,
 * пока их нет. Постоянно влетать в лимит и ждать снятия дороже, чем сразу
 * идти чуть медленнее. */
const MIN_INTERVAL_MS = 120
const MAX_INTERVAL_MS = 2000
/** Через столько удачных запросов подряд пробуем ускориться. */
const SPEEDUP_AFTER_OK = 20
/** Потолок ожидания после 429, если Figma не прислала Retry-After. */
const MAX_COOLDOWN_MS = 60_000

let queue: Promise<void> = Promise.resolve()
let cooldownUntil = 0
let interval = MIN_INTERVAL_MS
let okStreak = 0

function slowDown() {
  okStreak = 0
  interval = Math.min(MAX_INTERVAL_MS, Math.round(interval * 1.5))
}

function speedUp() {
  okStreak += 1
  if (okStreak < SPEEDUP_AFTER_OK) return
  okStreak = 0
  interval = Math.max(MIN_INTERVAL_MS, Math.round(interval / 1.25))
}

/** Ждёт своей очереди: сначала общий кулдаун, затем интервал между запросами. */
function reserveSlot(): Promise<void> {
  const ticket = queue.then(async () => {
    for (;;) {
      const wait = cooldownUntil - Date.now()
      if (wait <= 0) break
      await sleep(wait)
    }
    await sleep(interval)
  })
  queue = ticket.catch(() => {})
  return ticket
}

function startCooldown(ms: number) {
  cooldownUntil = Math.max(cooldownUntil, Date.now() + Math.min(ms, MAX_COOLDOWN_MS))
}

/** Сколько сейчас ждать очередь — рендерер показывает это в прогрессе синка. */
export function rateLimitDelayMs(): number {
  return Math.max(0, cooldownUntil - Date.now())
}

/* Ретраев на 429 больше, чем на 5xx: упереться в лимит на середине синка
 * дороже, чем подождать. Ожидание общее, так что повторы не множат нагрузку. */
const MAX_ATTEMPTS_RATE_LIMIT = 10
const MAX_ATTEMPTS_SERVER = 6

async function api<T>(pathname: string, attempt = 0): Promise<T> {
  const token = getFigmaToken()
  if (!token) throw new FigmaApiError(401, 'Figma не подключена: не задан personal access token')

  await reserveSlot()

  // Пути к v2 передаются целиком («/v2/...»), остальное живёт в v1.
  const url = pathname.startsWith('http')
    ? pathname
    : pathname.startsWith('/v2/')
      ? `${ORIGIN}${pathname}`
      : `${BASE}${pathname}`
  const res = await fetch(url, {
    headers: { 'X-Figma-Token': token },
  })

  const limit = res.status === 429
  if (limit) slowDown()
  else if (res.ok) speedUp()

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
    const data = await api<{ folders?: FigmaProject[] } | FigmaProject[]>(
      `/v2/teams/${encodeURIComponent(teamId)}/folders`,
    )
    const folders = Array.isArray(data) ? data : data.folders
    // Пустой список папок — законный ответ, а вот незнакомая форма ответа не
    // должна тихо превращаться в «синхронизировать нечего».
    if (!folders) throw new FigmaApiError(500, 'Неожиданный ответ /v2/teams/:id/folders')
    return { name: '', projects: folders.map((folder) => ({ id: folder.id, name: folder.name })) }
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
