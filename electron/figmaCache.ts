import * as figma from './figma'
import {
  FigmaFileCache,
  FigmaTeamRef,
  getFigmaTeams,
  readFigmaCache,
  saveFigmaTeams,
  writeFigmaCache,
} from './store'

/** Кэш считается свежим короткое время — при повторном открытии файла в течение
 * этого окна ничего не бьём по сети, просто отдаём то, что на диске. */
const FRESH_MS = 3 * 60 * 1000

function emptyFileCache(): FigmaFileCache {
  return { meta: null, versions: [], versionsCursor: null, comments: [], fetchedAt: 0 }
}

function mergeById<T extends { id: string }>(fresh: T[], existing: T[]): T[] {
  const seen = new Set(fresh.map((item) => item.id))
  return [...fresh, ...existing.filter((item) => !seen.has(item.id))]
}

function mergeAppend<T extends { id: string }>(base: T[], addition: T[]): T[] {
  const seen = new Set(base.map((item) => item.id))
  return [...base, ...addition.filter((item) => !seen.has(item.id))]
}

/* ---------- команды (ручной список — Figma API не отдаёт список команд токена) ---------- */

export async function addTeam(id: string, label: string): Promise<FigmaTeamRef[]> {
  const trimmedId = id.trim()
  const data = await figma.listTeamProjects(trimmedId) // валидирует доступ и заодно прогревает кэш
  const cache = readFigmaCache()
  cache.projectsByTeam[trimmedId] = data.projects
  writeFigmaCache(cache)

  const teams = getFigmaTeams()
  if (teams.some((team) => team.id === trimmedId)) return teams
  const next = [...teams, { id: trimmedId, label: label.trim() || data.name }]
  return saveFigmaTeams(next)
}

export function removeTeam(id: string): FigmaTeamRef[] {
  return saveFigmaTeams(getFigmaTeams().filter((team) => team.id !== id))
}

export function listTeams(): FigmaTeamRef[] {
  return getFigmaTeams()
}

/* ---------- проекты / файлы (лёгкие списки — всегда живой запрос, кэш как офлайн-фоллбэк) ---------- */

export async function listProjects(teamId: string): Promise<figma.FigmaProject[]> {
  const cache = readFigmaCache()
  try {
    const data = await figma.listTeamProjects(teamId)
    cache.projectsByTeam[teamId] = data.projects
    writeFigmaCache(cache)
    return data.projects
  } catch (error) {
    const cached = cache.projectsByTeam[teamId] as figma.FigmaProject[] | undefined
    if (cached) return cached
    throw error
  }
}

export async function listFiles(projectId: string): Promise<figma.FigmaFileSummary[]> {
  const cache = readFigmaCache()
  try {
    const data = await figma.listProjectFiles(projectId)
    cache.filesByProject[projectId] = data.files
    writeFigmaCache(cache)
    return data.files
  } catch (error) {
    const cached = cache.filesByProject[projectId] as figma.FigmaFileSummary[] | undefined
    if (cached) return cached
    throw error
  }
}

/* ---------- файл: метаданные + версии + комментарии, постранично поверх дискового кэша ---------- */

export async function getFileMeta(fileKey: string): Promise<figma.FigmaFileMeta> {
  const cache = readFigmaCache()
  const entry = cache.files[fileKey] ?? emptyFileCache()
  try {
    const meta = await figma.getFile(fileKey)
    entry.meta = meta
    cache.files[fileKey] = entry
    writeFigmaCache(cache)
    return meta
  } catch (error) {
    if (entry.meta) return entry.meta as figma.FigmaFileMeta
    throw error
  }
}

export interface Page<T> {
  items: T[]
  hasMore: boolean
  total: number
}

export async function getVersions(
  fileKey: string,
  offset: number,
  limit: number,
): Promise<Page<figma.FigmaVersion>> {
  const cache = readFigmaCache()
  const entry = cache.files[fileKey] ?? emptyFileCache()
  let versions = entry.versions as figma.FigmaVersion[]
  const hadVersionsBefore = versions.length > 0

  const stale = Date.now() - entry.fetchedAt > FRESH_MS
  if (stale || !hadVersionsBefore) {
    try {
      const first = await figma.getFileVersions(fileKey)
      versions = mergeById(first.versions, versions)
      // Курсор двигаем только при первой загрузке — иначе потеряем "хвост"
      // истории, до которого ещё не долистали через подгрузку следующих страниц.
      if (!hadVersionsBefore) entry.versionsCursor = first.nextCursor
      entry.versions = versions
      entry.fetchedAt = Date.now()
      cache.files[fileKey] = entry
      writeFigmaCache(cache)
    } catch {
      /* сеть недоступна — работаем с тем, что уже на диске */
    }
  }

  while (versions.length < offset + limit && entry.versionsCursor) {
    const next = await figma.getFileVersions(fileKey, entry.versionsCursor)
    versions = mergeAppend(versions, next.versions)
    entry.versions = versions
    entry.versionsCursor = next.nextCursor
    cache.files[fileKey] = entry
    writeFigmaCache(cache)
    if (next.versions.length === 0) break
  }

  const items = versions.slice(offset, offset + limit)
  return {
    items,
    hasMore: offset + limit < versions.length || Boolean(entry.versionsCursor),
    total: versions.length,
  }
}

export interface CommentsPage extends Page<figma.FigmaComment> {
  open: number
  resolved: number
}

export async function getComments(fileKey: string, offset: number, limit: number): Promise<CommentsPage> {
  const cache = readFigmaCache()
  const entry = cache.files[fileKey] ?? emptyFileCache()
  let comments = entry.comments as figma.FigmaComment[]

  const stale = Date.now() - entry.fetchedAt > FRESH_MS
  if (stale || comments.length === 0) {
    try {
      const data = await figma.getFileComments(fileKey)
      comments = data.comments
      entry.comments = comments
      entry.fetchedAt = Date.now()
      cache.files[fileKey] = entry
      writeFigmaCache(cache)
    } catch {
      /* сеть недоступна — работаем с тем, что уже на диске */
    }
  }

  // Счётчики считаем на стороне main-процесса над уже загруженным массивом —
  // рендереру не нужно тянуть тела всех комментариев, чтобы показать сводку.
  let open = 0
  for (const comment of comments) if (!comment.resolved_at) open += 1

  const items = comments.slice(offset, offset + limit)
  return { items, hasMore: offset + limit < comments.length, total: comments.length, open, resolved: comments.length - open }
}

/** Лёгкая сводка по всем файлам, которые уже когда-либо открывали — основа
 * дашборда "активность по пространству" без похода в API по каждому файлу. */
export function overviewSnapshot() {
  const cache = readFigmaCache()
  return Object.entries(cache.files).map(([fileKey, entry]) => ({
    fileKey,
    meta: (entry.meta ?? {}) as Partial<figma.FigmaFileMeta>,
    versions: entry.versions as figma.FigmaVersion[],
    comments: entry.comments as figma.FigmaComment[],
    fetchedAt: entry.fetchedAt,
  }))
}
