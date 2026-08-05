import { getFigmaToken } from './store'

const BASE = 'https://api.figma.com/v1'

export class FigmaApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Простой бэкофф на 429 — у Figma нет заголовка Retry-After на всех тарифах,
 * поэтому ждём с экспоненциальным ростом вместо мгновенного повтора. */
async function api<T>(pathname: string, attempt = 0): Promise<T> {
  const token = getFigmaToken()
  if (!token) throw new FigmaApiError(401, 'Figma не подключена: не задан personal access token')

  const res = await fetch(pathname.startsWith('http') ? pathname : `${BASE}${pathname}`, {
    headers: { 'X-Figma-Token': token },
  })

  // Глубокая выкачка истории делает тысячи запросов, поэтому ждём дольше и
  // настойчивее: упереться в 429 на середине синка дороже, чем потерять минуту.
  if ((res.status === 429 || res.status >= 500) && attempt < 6) {
    const retryAfter = Number(res.headers.get('retry-after'))
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 800 * 2 ** attempt
    await new Promise((resolve) => setTimeout(resolve, Math.min(wait, 30_000)))
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

export function listTeamProjects(teamId: string) {
  return api<{ name: string; projects: FigmaProject[] }>(`/teams/${encodeURIComponent(teamId)}/projects`)
}

export interface FigmaFileSummary {
  key: string
  name: string
  thumbnail_url?: string
  last_modified: string
}

export function listProjectFiles(projectId: string) {
  return api<{ name: string; files: FigmaFileSummary[] }>(`/projects/${encodeURIComponent(projectId)}/files`)
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
