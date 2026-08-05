import { useEffect, useState } from 'react'
import { ipc } from '@/lib/ipc'
import type { FigmaFileSummary, FigmaPinnedFile, FigmaProject, FigmaTeamRef } from '@/types'
import { Input, Spinner } from '@/components/ui'
import { AppIcon, type IconName } from '@/components/AppIcon'
import { CrossGlyph, PlusGlyph } from '@/components/Glyphs'
import { cn } from '@/lib/cn'
import { AddTeamModal } from './AddTeamModal'

export interface SectionItem<T extends string> {
  value: T
  label: string
  icon: IconName
  /** Группа в навигации — разделы одного смысла стоят рядом. */
  group: string
}

interface Props<T extends string> {
  sections: SectionItem<T>[]
  section: T
  onSection: (section: T) => void
  selectedFileKey: string | null
  onSelectFile: (key: string, name: string) => void
  teams: FigmaTeamRef[]
  onTeamsChanged: (teams: FigmaTeamRef[]) => void
  collapsed: boolean
  onToggleCollapsed: () => void
  pinned: FigmaPinnedFile[]
  onUnpin: (key: string) => void
  onOpenPalette: () => void
}

export function FigmaSidebar<T extends string>({
  sections,
  section,
  onSection,
  selectedFileKey,
  onSelectFile,
  teams,
  onTeamsChanged,
  collapsed,
  onToggleCollapsed,
  pinned,
  onUnpin,
  onOpenPalette,
}: Props<T>) {
  const [filter, setFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const groups = sections.reduce<Record<string, SectionItem<T>[]>>((acc, item) => {
    acc[item.group] = [...(acc[item.group] ?? []), item]
    return acc
  }, {})

  if (collapsed) {
    return (
      <aside className="flex h-full w-14 shrink-0 flex-col items-center gap-1 py-3">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="mb-1 flex h-9 w-9 items-center justify-center rounded-control text-muted hover:bg-[var(--sunken)] hover:text-ink"
          aria-label="Развернуть навигацию"
          title="Развернуть навигацию"
        >
          <AppIcon name="ChevronRight" size={16} />
        </button>
        {sections.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onSection(item.value)}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-control transition-colors',
              section === item.value && selectedFileKey === null
                ? 'bg-surface text-ink'
                : 'text-muted hover:bg-[var(--sunken)] hover:text-ink',
            )}
            aria-label={item.label}
            title={item.label}
          >
            <AppIcon name={item.icon} size={16} />
          </button>
        ))}
      </aside>
    )
  }

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col gap-3 p-3 pr-0">
      <div className="flex items-center gap-1 pr-2">
        <button
          type="button"
          onClick={onOpenPalette}
          className="flex h-10 min-w-0 flex-1 items-center gap-2 whitespace-nowrap rounded-control bg-surface px-3 text-[13px] text-muted transition-colors hover:text-ink"
        >
          <AppIcon name="Search" size={16} className="shrink-0" />
          Поиск
          <kbd className="ml-auto shrink-0 rounded-chip bg-[var(--sunken)] px-1.5 py-0.5 text-[11px]">⌘K</kbd>
        </button>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex h-10 w-9 shrink-0 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface hover:text-ink"
          aria-label="Свернуть навигацию"
          title="Свернуть навигацию"
        >
          <AppIcon name="ChevronLeft" size={16} />
        </button>
      </div>

      <div className="scroll-thin -mr-1 flex-1 overflow-y-auto pr-2">
        <nav className="space-y-3">
          {Object.entries(groups).map(([group, items]) => (
            <section key={group} className="rounded-card bg-surface p-2">
              <h3 className="mb-1 pl-2 text-[12px] font-semibold lowercase text-muted">{group}</h3>
              <div className="space-y-0.5">
                {items.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onSection(item.value)}
                    className={cn(
                      'flex h-9 w-full items-center gap-2.5 rounded-control px-2 text-[13px] font-medium transition-colors',
                      section === item.value && selectedFileKey === null
                        ? 'bg-[var(--sunken)] text-ink'
                        : 'text-muted hover:bg-[var(--sunken)] hover:text-ink',
                    )}
                  >
                    <AppIcon name={item.icon} size={16} />
                    {item.label}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </nav>

        {pinned.length > 0 ? (
          <section className="mt-3 rounded-card bg-surface p-2">
            <h3 className="mb-1 pl-2 text-[12px] font-semibold lowercase text-muted">закреплённые</h3>
            <div className="space-y-0.5">
              {pinned.map((file) => (
                <div key={file.key} className="group flex items-center rounded-control hover:bg-[var(--sunken)]">
                  <button
                    type="button"
                    onClick={() => onSelectFile(file.key, file.name)}
                    className={cn(
                      'flex h-8 min-w-0 flex-1 items-center gap-1.5 px-2 text-left text-[13px] transition-colors',
                      selectedFileKey === file.key ? 'text-ink' : 'text-muted',
                    )}
                    title={file.name}
                  >
                    <span className="truncate">{file.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onUnpin(file.key)}
                    className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-control text-faint opacity-0 hover:text-ink group-hover:opacity-100"
                    aria-label="Открепить"
                    title="Открепить"
                  >
                    <CrossGlyph size={13} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-3 rounded-card bg-surface p-2">
          <div className="mb-1 flex items-center justify-between pl-2">
            <h3 className="text-[12px] font-semibold lowercase text-muted">команды</h3>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex h-7 w-7 items-center justify-center rounded-control text-muted hover:bg-[var(--sunken)] hover:text-ink"
              aria-label="Добавить команду"
              title="Добавить команду"
            >
              <PlusGlyph size={16} />
            </button>
          </div>

          <div className="px-1 pb-1">
            <Input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Фильтр по дереву…"
              className="h-9 bg-[var(--sunken)] text-[13px]"
            />
          </div>

          {teams.length === 0 ? (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-1 w-full rounded-control px-3 py-4 text-[13px] leading-relaxed text-muted hover:bg-[var(--sunken)] hover:text-ink"
            >
              Команд пока нет.
              <br />
              Добавить команду
            </button>
          ) : (
            <div className="mt-1 space-y-0.5">
              {teams.map((team) => (
                <TeamNode
                  key={team.id}
                  team={team}
                  filter={filter}
                  selectedFileKey={selectedFileKey}
                  onSelectFile={onSelectFile}
                  onRemoved={async () => {
                    const next = await ipc.figmaTeamsRemove(team.id)
                    onTeamsChanged(next)
                  }}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <AddTeamModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={(next) => {
          setModalOpen(false)
          onTeamsChanged(next)
        }}
      />
    </aside>
  )
}

function TeamNode({
  team,
  filter,
  selectedFileKey,
  onSelectFile,
  onRemoved,
}: {
  team: FigmaTeamRef
  filter: string
  selectedFileKey: string | null
  onSelectFile: (key: string, name: string) => void
  onRemoved: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<FigmaProject[] | null>(null)

  useEffect(() => {
    if (!expanded || projects !== null) return
    setLoading(true)
    ipc
      .figmaProjects(team.id)
      .then(setProjects)
      .finally(() => setLoading(false))
  }, [expanded, projects, team.id])

  const visibleProjects = filter
    ? (projects ?? []).filter((project) => project.name.toLowerCase().includes(filter.toLowerCase()))
    : projects

  return (
    <div>
      <div className="group flex items-center rounded-control hover:bg-[var(--sunken)]">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex h-8 flex-1 items-center gap-1.5 px-1.5 text-[13px] font-medium text-ink"
        >
          <AppIcon name={expanded ? 'ChevronDown' : 'ChevronRight'} size={14} className="text-faint" />
          <span className="truncate">{team.label || team.id}</span>
        </button>
        <button
          type="button"
          onClick={onRemoved}
          className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-control text-faint opacity-0 hover:bg-[var(--line)] hover:text-ink group-hover:opacity-100"
          aria-label="Убрать команду"
          title="Убрать из списка"
        >
          <CrossGlyph size={14} />
        </button>
      </div>

      {expanded ? (
        <div className="ml-3 border-l border-line pl-2">
          {loading ? (
            <div className="flex justify-center py-2">
              <Spinner className="h-3.5 w-3.5" />
            </div>
          ) : (
            (visibleProjects ?? []).map((project) => (
              <ProjectNode
                key={project.id}
                project={project}
                filter={filter}
                selectedFileKey={selectedFileKey}
                onSelectFile={onSelectFile}
              />
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

function ProjectNode({
  project,
  filter,
  selectedFileKey,
  onSelectFile,
}: {
  project: FigmaProject
  filter: string
  selectedFileKey: string | null
  onSelectFile: (key: string, name: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState<FigmaFileSummary[] | null>(null)

  useEffect(() => {
    if (!expanded || files !== null) return
    setLoading(true)
    ipc
      .figmaFiles(project.id)
      .then(setFiles)
      .finally(() => setLoading(false))
  }, [expanded, files, project.id])

  const visibleFiles = filter
    ? (files ?? []).filter((file) => file.name.toLowerCase().includes(filter.toLowerCase()))
    : files

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex h-8 w-full items-center gap-1.5 rounded-control px-1.5 text-[13px] text-muted hover:bg-[var(--sunken)] hover:text-ink"
      >
        <AppIcon name={expanded ? 'ChevronDown' : 'ChevronRight'} size={14} className="text-faint" />
        <span className="truncate">{project.name}</span>
      </button>

      {expanded ? (
        <div className="ml-3 border-l border-line pl-2">
          {loading ? (
            <div className="flex justify-center py-1.5">
              <Spinner className="h-3 w-3" />
            </div>
          ) : (visibleFiles ?? []).length === 0 ? (
            <p className="px-1.5 py-1 text-[12px] text-faint">Файлов нет</p>
          ) : (
            (visibleFiles ?? []).map((file) => (
              <button
                key={file.key}
                type="button"
                onClick={() => onSelectFile(file.key, file.name)}
                className={cn(
                  'flex h-8 w-full items-center gap-1.5 rounded-control px-1.5 text-left text-[13px] transition-colors',
                  selectedFileKey === file.key
                    ? 'bg-[var(--sunken)] text-ink'
                    : 'text-muted hover:bg-[var(--sunken)] hover:text-ink',
                )}
                title={file.name}
              >
                <span className="truncate">{file.name}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}
