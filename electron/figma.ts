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

  if (res.status === 429 && attempt < 3) {
    await new Promise((resolve) => setTimeout(resolve, 600 * 2 ** attempt))
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

export interface FigmaComment {
  id: string
  parent_id: string
  user: { id: string; handle: string; img_url: string }
  created_at: string
  resolved_at: string | null
  message: string
  order_id: string | null
}

export function getFileComments(fileKey: string) {
  return api<{ comments: FigmaComment[] }>(`/files/${encodeURIComponent(fileKey)}/comments`)
}
