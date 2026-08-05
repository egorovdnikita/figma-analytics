import { useEffect, useState } from 'react'
import { ipc } from '@/lib/ipc'
import type { FigmaFileSummary, FigmaProject, FigmaTeamRef } from '@/types'
import { Input, Spinner } from '@/components/ui'
import { AppIcon, type IconName } from '@/components/AppIcon'
import { cn } from '@/lib/cn'
import { AddTeamModal } from './AddTeamModal'

interface SectionItem<T extends string> {
  value: T
  label: string
  icon: IconName
}

interface Props<T extends string> {
  sections: SectionItem<T>[]
  section: T
  onSection: (section: T) => void
  selectedFileKey: string | null
  onSelectFile: (key: string, name: string) => void
  teams: FigmaTeamRef[]
  onTeamsChanged: (teams: FigmaTeamRef[]) => void
}

export function FigmaSidebar<T extends string>({
  sections,
  section,
  onSection,
  selectedFileKey,
  onSelectFile,
  teams,
  onTeamsChanged,
}: Props<T>) {
  const [filter, setFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <aside className="flex h-full w-[264px] shrink-0 flex-col gap-3 border-r border-line p-3">
      <nav className="space-y-0.5">
        {sections.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onSection(item.value)}
            className={cn(
              'flex h-9 w-full items-center gap-2 rounded-control px-2.5 text-[13px] font-medium transition-colors',
              section === item.value && selectedFileKey === null
                ? 'bg-surface text-ink'
                : 'text-muted hover:bg-[var(--sunken)] hover:text-ink',
            )}
          >
            <AppIcon name={item.icon} size={16} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="border-t border-line pt-3">
        <div className="mb-2 flex items-center justify-between pl-1">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-faint">Команды</h3>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex h-6 w-6 items-center justify-center rounded-control text-muted hover:bg-[var(--sunken)] hover:text-ink"
            aria-label="Добавить команду"
            title="Добавить команду"
          >
            <AppIcon name="Plus" size={16} />
          </button>
        </div>

        <Input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Фильтр по дереву…"
          className="h-8 text-[12px]"
        />
      </div>

      <div className="scroll-thin -mr-1 flex-1 overflow-y-auto pr-1">
        {teams.length === 0 ? (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="w-full rounded-control border border-dashed border-line px-3 py-4 text-[12px] leading-relaxed text-muted hover:border-[var(--lilac)] hover:text-ink"
          >
            Команд пока нет.
            <br />
            Добавить команду
          </button>
        ) : (
          <div className="space-y-0.5">
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
          <AppIcon name="X" size={13} />
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
        className="flex h-7 w-full items-center gap-1.5 rounded-control px-1.5 text-[12.5px] text-muted hover:bg-[var(--sunken)] hover:text-ink"
      >
        <AppIcon name={expanded ? 'ChevronDown' : 'ChevronRight'} size={13} className="text-faint" />
        <span className="truncate">{project.name}</span>
      </button>

      {expanded ? (
        <div className="ml-3 border-l border-line pl-2">
          {loading ? (
            <div className="flex justify-center py-1.5">
              <Spinner className="h-3 w-3" />
            </div>
          ) : (visibleFiles ?? []).length === 0 ? (
            <p className="px-1.5 py-1 text-[11px] text-faint">Файлов нет</p>
          ) : (
            (visibleFiles ?? []).map((file) => (
              <button
                key={file.key}
                type="button"
                onClick={() => onSelectFile(file.key, file.name)}
                className={cn(
                  'flex h-7 w-full items-center gap-1.5 rounded-control px-1.5 text-left text-[12.5px] transition-colors',
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
