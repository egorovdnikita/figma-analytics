import * as figma from './figma'
import fs from 'node:fs'
import {
  FigmaFileCache,
  FigmaTeamRef,
  getFigmaHiddenUsers,
  getFigmaPrefs,
  getFigmaTeams,
  flushFigmaCache,
  readFigmaCache,
  saveFigmaHiddenUsers,
  saveFigmaTeams,
  storageInfo,
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
  const next = saveFigmaTeams(getFigmaTeams().filter((team) => team.id !== id))
  pruneCache(next)
  return next
}

/** Выкидывает из кэша всё, что не принадлежит ни одной подключённой команде.
 *
 * Убрать команду из списка мало: её проекты остаются в списках, а файлы
 * продолжают давать события в аналитику. Сюда же попадают записи, осевшие после
 * ручного открытия карточки файла — у них нет команды, и при следующем открытии
 * они всё равно перезапросятся. */
export function pruneCache(teams: FigmaTeamRef[] = getFigmaTeams()) {
  const allowed = new Set(teams.map((team) => team.id))
  const cache = readFigmaCache()
  const keptProjects = new Set<string>()
  let removed = 0

  for (const [teamId, projects] of Object.entries(cache.projectsByTeam)) {
    if (allowed.has(teamId)) {
      for (const project of projects as figma.FigmaProject[]) keptProjects.add(project.id)
    } else {
      delete cache.projectsByTeam[teamId]
      removed += 1
    }
  }
  for (const projectId of Object.keys(cache.filesByProject)) {
    if (!keptProjects.has(projectId)) delete cache.filesByProject[projectId]
  }
  for (const [key, entry] of Object.entries(cache.files)) {
    if (!entry.teamId || !allowed.has(entry.teamId)) {
      delete cache.files[key]
      removed += 1
    }
  }

  if (removed > 0) writeFigmaCache(cache)
  return removed
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
    entry.fileName = meta.name
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
    if (!next.nextCursor) entry.versionsComplete = true
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

/* ---------- полная синхронизация пространства ---------- */

export interface SyncProgress {
  phase: 'projects' | 'files' | 'history' | 'done'
  done: number
  total: number
  current: string
  /** Сколько ещё ждать снятия лимита Figma: синк на этом месте не завис, а
   * стоит в общей очереди — без этого «очень долго» выглядит как зависание. */
  rateLimitMs: number
}

export type SyncFailureReason = 'rate-limit' | 'forbidden' | 'missing' | 'unauthorized' | 'unknown'

/** Что именно не прочиталось: команда, проект или файл. Без этого сообщение
 * в интерфейсе врёт («не прочитано файлов», когда упал проект) и не даёт понять,
 * где в данных дыра. */
export type SyncFailureScope = 'team' | 'project' | 'file'

export interface SyncFailure {
  scope: SyncFailureScope
  name: string
  reason: SyncFailureReason
  /** Что ответила Figma: код и текст. Классификация выше говорит, что делать,
   * а это — единственный способ понять, почему именно отказали. */
  detail?: string
}

export interface SyncResult {
  files: number
  /** Файлы, у которых история не менялась и не перечитывалась. */
  skipped: number
  versions: number
  comments: number
  errors: SyncFailure[]
  finishedAt: number
}

/* Глубина истории и параллельность берутся из настроек раздела: 30 версий на
 * страницу, потолок нужен только чтобы один патологический файл не съел весь
 * бюджет запросов. */

async function pooled<T>(items: T[], size: number, worker: (item: T, index: number) => Promise<void>) {
  let cursor = 0
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    for (;;) {
      const index = cursor++
      if (index >= items.length) return
      await worker(items[index], index)
    }
  })
  await Promise.all(runners)
}

export async function syncAll(onProgress: (progress: SyncProgress) => void): Promise<SyncResult> {
  const teams = getFigmaTeams()
  const prefs = getFigmaPrefs()
  const errors: SyncFailure[] = []

  // 1. Проекты по каждой команде
  onProgress({ phase: 'projects', done: 0, total: teams.length, current: '', rateLimitMs: 0 })
  const projects: Array<{ teamId: string; teamName: string; id: string; name: string }> = []
  for (const [index, team] of teams.entries()) {
    try {
      const data = await figma.listTeamProjects(team.id)
      for (const project of data.projects) {
        projects.push({ teamId: team.id, teamName: team.label || data.name, id: project.id, name: project.name })
      }
      const cache = readFigmaCache()
      cache.projectsByTeam[team.id] = data.projects
      writeFigmaCache(cache)
    } catch (error) {
      errors.push({ scope: 'team', name: team.label || team.id, reason: failureReason(error), detail: failureDetail(error) })
    }
    onProgress({
      phase: 'projects',
      done: index + 1,
      total: teams.length,
      current: team.label || team.id,
      rateLimitMs: figma.rateLimitDelayMs(),
    })
  }

  // 2. Файлы по каждому проекту
  onProgress({ phase: 'files', done: 0, total: projects.length, current: '', rateLimitMs: 0 })
  const files: Array<{
    key: string
    name: string
    lastModified: string
    projectId: string
    projectName: string
    teamId: string
    teamName: string
  }> = []
  for (const [index, project] of projects.entries()) {
    try {
      const data = await figma.listProjectFiles(project.id)
      const cache = readFigmaCache()
      cache.filesByProject[project.id] = data.files
      writeFigmaCache(cache)
      for (const file of data.files) {
        files.push({
          key: file.key,
          name: file.name,
          lastModified: file.last_modified,
          projectId: project.id,
          projectName: project.name,
          teamId: project.teamId,
          teamName: project.teamName,
        })
      }
    } catch (error) {
      errors.push({ scope: 'project', name: project.name, reason: failureReason(error), detail: failureDetail(error) })
    }
    onProgress({
      phase: 'files',
      done: index + 1,
      total: projects.length,
      current: project.name,
      rateLimitMs: figma.rateLimitDelayMs(),
    })
  }

  // 3. История версий + комментарии по каждому файлу
  let processed = 0
  let versionCount = 0
  let commentCount = 0
  onProgress({ phase: 'history', done: 0, total: files.length, current: '', rateLimitMs: 0 })

  let skipped = 0

  await pooled(files, prefs.syncConcurrency, async (file) => {
    try {
      const before = readFigmaCache().files[file.key]

      // История версий меняется только вместе с last_modified файла. Если он
      // тот же, а история уже выкачана до конца, версии не трогаем: это самая
      // дорогая часть синка (страница на 30 версий, десятки страниц на файл).
      const versionsUnchanged =
        Boolean(before?.versionsComplete) &&
        Boolean(before?.lastModified) &&
        before?.lastModified === file.lastModified

      if (versionsUnchanged) skipped += 1

      const [versions, comments] = await Promise.all([
        versionsUnchanged
          ? Promise.resolve({
              items: (before?.versions ?? []) as figma.FigmaVersion[],
              nextCursor: null,
              complete: true,
            })
          : fetchVersionHistory(
              file.key,
              (before?.versions ?? []) as figma.FigmaVersion[],
              Boolean(before?.versionsComplete),
              prefs.syncDepthPages,
            ),
        // Комментарии тянем всегда: обсуждение не меняет last_modified файла.
        figma.getFileComments(file.key).then((r) => r.comments),
      ])

      // Кэш держится в памяти, поэтому правим свою запись прямо здесь: воркеры
      // работают с одним объектом и не затирают друг друга целым снимком.
      const cache = readFigmaCache()
      const entry = cache.files[file.key] ?? emptyFileCache()
      entry.versions = versions.items
      entry.versionsCursor = versions.nextCursor
      entry.versionsComplete = versions.complete
      entry.comments = comments
      entry.fetchedAt = Date.now()
      entry.fileName = file.name
      entry.lastModified = file.lastModified
      entry.projectId = file.projectId
      entry.projectName = file.projectName
      entry.teamId = file.teamId
      entry.teamName = file.teamName
      if (!entry.meta) entry.meta = { name: file.name }
      cache.files[file.key] = entry
      writeFigmaCache(cache)

      versionCount += versions.items.length
      commentCount += comments.length
    } catch (error) {
      errors.push({ scope: 'file', name: file.name, reason: failureReason(error), detail: failureDetail(error) })
    }
    processed += 1
    onProgress({
      phase: 'history',
      done: processed,
      total: files.length,
      current: file.name,
      rateLimitMs: figma.rateLimitDelayMs(),
    })
  })

  // Синк закончился — снимок должен оказаться на диске сразу, не по таймеру.
  flushFigmaCache()

  onProgress({ phase: 'done', done: files.length, total: files.length, current: '', rateLimitMs: 0 })
  return {
    files: files.length,
    skipped,
    versions: versionCount,
    comments: commentCount,
    errors,
    finishedAt: Date.now(),
  }
}

/** Человеческая причина отказа: рендереру нужен не текст от Figma, а понимание,
 * что делать дальше. */
function failureDetail(error: unknown): string | undefined {
  const { status, message } = error as { status?: number; message?: string }
  if (!status && !message) return undefined
  return [status, message].filter(Boolean).join(' ')
}

function failureReason(error: unknown): SyncFailureReason {
  const status = (error as { status?: number }).status
  if (status === 429) return 'rate-limit'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'missing'
  if (status === 401) return 'unauthorized'
  return 'unknown'
}

/** Догружает историю версий поверх уже сохранённой.
 *
 * Если история файла ранее была выкачана до конца, повторный синк листает
 * страницы только до первой уже известной версии и останавливается — иначе
 * каждый запуск заново тянул бы тысячи страниц по всему пространству. Если
 * история неполная (первый синк или прошлый прервался на потолке), идём вглубь
 * до упора. */
async function fetchVersionHistory(
  fileKey: string,
  existing: figma.FigmaVersion[],
  wasComplete: boolean,
  maxPages: number,
) {
  const known = new Set(existing.map((version) => version.id))
  const fetched: figma.FigmaVersion[] = []
  let cursor: string | undefined
  let complete = false
  let reachedKnown = false

  for (let page = 0; page < maxPages; page += 1) {
    const chunk = await figma.getFileVersions(fileKey, cursor)
    fetched.push(...chunk.versions)

    if (wasComplete && chunk.versions.some((version) => known.has(version.id))) {
      reachedKnown = true
      complete = true
      break
    }
    if (!chunk.nextCursor || chunk.versions.length === 0) {
      complete = true
      break
    }
    cursor = chunk.nextCursor
  }

  // Версии приходят от свежих к старым, поэтому новые кладём в начало.
  const items = mergeAppend(mergeById(fetched, []), existing)
  return { items, nextCursor: complete ? null : (cursor ?? null), complete, reachedKnown }
}

/* ---------- нормализованный поток событий ("каждый чих") ---------- */

export type FigmaEventKind = 'version' | 'comment' | 'reply' | 'resolve' | 'reaction'

export interface FigmaEvent {
  kind: FigmaEventKind
  ts: string
  userId: string
  handle: string
  img: string
  fileKey: string
  fileName: string
  projectId: string
  projectName: string
  teamId: string
  teamName: string
  label?: string
  message?: string
  emoji?: string
  threadId?: string
  nodeId?: string
}

/** Разворачивает дисковый кэш в плоский поток событий. Каждое сохранение,
 * комментарий, ответ, закрытие обсуждения и реакция — отдельное событие с
 * автором и временем, поверх которого рендерер строит любую аналитику. */
export function buildEvents(): FigmaEvent[] {
  const cache = readFigmaCache()
  const hidden = new Set(getFigmaHiddenUsers())
  const events: FigmaEvent[] = []

  for (const [fileKey, entry] of Object.entries(cache.files)) {
    const meta = (entry.meta ?? {}) as Partial<figma.FigmaFileMeta>
    const base = {
      fileKey,
      fileName: entry.fileName ?? meta.name ?? fileKey,
      projectId: entry.projectId ?? '',
      projectName: entry.projectName ?? '',
      teamId: entry.teamId ?? '',
      teamName: entry.teamName ?? '',
    }

    for (const version of entry.versions as figma.FigmaVersion[]) {
      events.push({
        ...base,
        kind: 'version',
        ts: version.created_at,
        userId: version.user?.id ?? '',
        handle: version.user?.handle ?? '—',
        img: version.user?.img_url ?? '',
        label: version.label ?? undefined,
        message: version.description ?? undefined,
      })
    }

    const comments = entry.comments as figma.FigmaComment[]
    for (const comment of comments) {
      events.push({
        ...base,
        kind: comment.parent_id ? 'reply' : 'comment',
        ts: comment.created_at,
        userId: comment.user?.id ?? '',
        handle: comment.user?.handle ?? '—',
        img: comment.user?.img_url ?? '',
        message: comment.message,
        threadId: comment.parent_id || comment.id,
        nodeId: comment.client_meta?.node_id,
      })

      if (comment.resolved_at) {
        // Кто именно закрыл обсуждение, Figma в API не отдаёт — поэтому у
        // события "решено" автор пустой, оно считается только по файлу/времени.
        events.push({
          ...base,
          kind: 'resolve',
          ts: comment.resolved_at,
          userId: '',
          handle: '',
          img: '',
          message: comment.message,
          threadId: comment.parent_id || comment.id,
        })
      }

      for (const reaction of comment.reactions ?? []) {
        events.push({
          ...base,
          kind: 'reaction',
          ts: reaction.created_at,
          userId: reaction.user?.id ?? '',
          handle: reaction.user?.handle ?? '—',
          img: reaction.user?.img_url ?? '',
          emoji: reaction.emoji,
          threadId: comment.parent_id || comment.id,
        })
      }
    }
  }

  return events
    .filter((event) => !event.handle || !hidden.has(event.handle))
    .sort((a, b) => b.ts.localeCompare(a.ts))
}

/** Все участники, когда-либо встречавшиеся в кэше, включая скрытых — нужен,
 * чтобы скрытого человека можно было вернуть обратно в аналитику. */
export function peopleDirectory() {
  const cache = readFigmaCache()
  const hidden = new Set(getFigmaHiddenUsers())
  const map = new Map<string, { handle: string; img: string; events: number; hidden: boolean }>()

  const touch = (handle: string, img: string) => {
    if (!handle) return
    const existing = map.get(handle) ?? { handle, img, events: 0, hidden: hidden.has(handle) }
    existing.events += 1
    if (!existing.img && img) existing.img = img
    map.set(handle, existing)
  }

  for (const entry of Object.values(cache.files)) {
    for (const version of entry.versions as figma.FigmaVersion[]) {
      touch(version.user?.handle ?? '', version.user?.img_url ?? '')
    }
    for (const comment of entry.comments as figma.FigmaComment[]) {
      touch(comment.user?.handle ?? '', comment.user?.img_url ?? '')
      for (const reaction of comment.reactions ?? []) {
        touch(reaction.user?.handle ?? '', reaction.user?.img_url ?? '')
      }
    }
  }

  return [...map.values()].sort((a, b) => b.events - a.events)
}

export function listHiddenUsers() {
  return getFigmaHiddenUsers()
}

/* ---------- состояние кэша и выгрузка ---------- */

export interface CacheStats {
  files: number
  versions: number
  comments: number
  reactions: number
  incompleteFiles: number
  oldestEvent: string | null
  newestEvent: string | null
  bytes: number
  directory: string
  lastFetchedAt: number | null
}

export function cacheStats(): CacheStats {
  const cache = readFigmaCache()
  const entries = Object.values(cache.files)

  let versions = 0
  let comments = 0
  let reactions = 0
  let incompleteFiles = 0
  let oldest: string | null = null
  let newest: string | null = null
  let lastFetchedAt: number | null = null

  const track = (ts: string) => {
    if (!ts) return
    if (!oldest || ts < oldest) oldest = ts
    if (!newest || ts > newest) newest = ts
  }

  for (const entry of entries) {
    versions += entry.versions.length
    comments += entry.comments.length
    if (!entry.versionsComplete) incompleteFiles += 1
    if (entry.fetchedAt && (!lastFetchedAt || entry.fetchedAt > lastFetchedAt)) lastFetchedAt = entry.fetchedAt
    for (const version of entry.versions as figma.FigmaVersion[]) track(version.created_at)
    for (const comment of entry.comments as figma.FigmaComment[]) {
      track(comment.created_at)
      reactions += comment.reactions?.length ?? 0
    }
  }

  const info = storageInfo()
  let bytes = 0
  try {
    bytes = fs.statSync(`${info.directory}/figma-cache.json`).size
  } catch {
    /* файла ещё нет */
  }

  return {
    files: entries.length,
    versions,
    comments,
    reactions,
    incompleteFiles,
    oldestEvent: oldest,
    newestEvent: newest,
    bytes,
    directory: info.directory,
    lastFetchedAt,
  }
}

/** Полный сброс собранной истории. Токен и список команд не трогаем —
 * иначе после очистки пришлось бы заново подключать аккаунт. */
export function clearCache() {
  writeFigmaCache({ projectsByTeam: {}, filesByProject: {}, files: {}, libraryByTeam: {} })
  flushFigmaCache() // очистка должна доехать до диска сразу, а не по таймеру
  return true
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** CSV со всеми событиями — чтобы аналитику можно было доводить в таблице. */
export function exportEventsCsv(): string {
  const header = ['Время', 'Тип', 'Участник', 'Файл', 'Проект', 'Команда', 'Текст', 'Эмодзи']
  const rows = buildEvents().map((event) =>
    [
      event.ts,
      event.kind,
      event.handle,
      event.fileName,
      event.projectName,
      event.teamName,
      (event.message ?? '').replace(/\s+/g, ' ').slice(0, 500),
      event.emoji ?? '',
    ]
      .map(csvCell)
      .join(','),
  )
  return `﻿${[header.join(','), ...rows].join('\n')}`
}

export function setHiddenUsers(handles: string[]) {
  return saveFigmaHiddenUsers([...new Set(handles.filter(Boolean))])
}

/** Плоский справочник файлов из кэша — для таблицы файлов и фильтров. */
export function fileIndex() {
  const cache = readFigmaCache()
  return Object.entries(cache.files).map(([fileKey, entry]) => {
    const meta = (entry.meta ?? {}) as Partial<figma.FigmaFileMeta>
    const comments = entry.comments as figma.FigmaComment[]
    return {
      fileKey,
      name: entry.fileName ?? meta.name ?? fileKey,
      projectId: entry.projectId ?? '',
      projectName: entry.projectName ?? '',
      teamId: entry.teamId ?? '',
      teamName: entry.teamName ?? '',
      lastModified: meta.lastModified ?? null,
      thumbnailUrl: meta.thumbnailUrl ?? null,
      versions: entry.versions.length,
      comments: comments.length,
      openComments: comments.filter((c) => !c.resolved_at).length,
      versionsComplete: Boolean(entry.versionsComplete),
      fetchedAt: entry.fetchedAt,
    }
  })
}

/* ---------- библиотека команды (опубликованные компоненты/стили) ---------- */

const LIBRARY_FRESH_MS = 10 * 60 * 1000

export interface TeamLibrarySummary {
  componentsCount: number
  componentSetsCount: number
  stylesCount: number
  lastPublished: string | null
  recent: Array<{
    key: string
    name: string
    kind: 'component' | 'component_set' | 'style'
    updatedAt: string
    user: { handle: string; img_url: string }
  }>
  /** Публикации по авторам — кто реально ведёт дизайн-систему. */
  byAuthor: Array<{ handle: string; img_url: string; count: number }>
}

export async function getTeamLibrary(teamId: string): Promise<TeamLibrarySummary> {
  const cache = readFigmaCache()
  const cached = cache.libraryByTeam[teamId]
  if (cached && Date.now() - cached.fetchedAt < LIBRARY_FRESH_MS) {
    return cached.data as TeamLibrarySummary
  }

  try {
    const [components, componentSets, styles] = await Promise.all([
      figma.getTeamComponents(teamId),
      figma.getTeamComponentSets(teamId),
      figma.getTeamStyles(teamId),
    ])

    const items = [
      ...components.map((item) => ({ ...item, kind: 'component' as const })),
      ...componentSets.map((item) => ({ ...item, kind: 'component_set' as const })),
      ...styles.map((item) => ({ ...item, kind: 'style' as const })),
    ]

    const lastPublished = items.reduce<string | null>(
      (max, item) => (!max || item.updated_at > max ? item.updated_at : max),
      null,
    )

    const recent = [...items]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 8)
      .map((item) => ({
        key: item.key,
        name: item.name,
        kind: item.kind,
        updatedAt: item.updated_at,
        user: { handle: item.user?.handle ?? '—', img_url: item.user?.img_url ?? '' },
      }))

    const authorMap = new Map<string, { handle: string; img_url: string; count: number }>()
    for (const item of items) {
      const handle = item.user?.handle ?? '—'
      const existing = authorMap.get(handle) ?? { handle, img_url: item.user?.img_url ?? '', count: 0 }
      existing.count += 1
      authorMap.set(handle, existing)
    }

    const summary: TeamLibrarySummary = {
      componentsCount: components.length,
      componentSetsCount: componentSets.length,
      stylesCount: styles.length,
      lastPublished,
      recent,
      byAuthor: [...authorMap.values()].sort((a, b) => b.count - a.count),
    }

    cache.libraryByTeam[teamId] = { data: summary, fetchedAt: Date.now() }
    writeFigmaCache(cache)
    return summary
  } catch (error) {
    if (cached) return cached.data as TeamLibrarySummary
    throw error
  }
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
