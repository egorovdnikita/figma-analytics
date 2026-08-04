import { useEffect, useState } from 'react'
import { ipc, BoxUiError } from '@/lib/ipc'
import type { FigmaFileSummary, FigmaProject, FigmaTeamRef } from '@/types'
import { Button, Input, Spinner } from '@/components/ui'
import { AppIcon } from '@/components/AppIcon'
import { cn } from '@/lib/cn'

interface Props {
  selectedFileKey: string | null
  onSelectFile: (key: string, name: string) => void
  onSelectOverview: () => void
}

export function FigmaSidebar({ selectedFileKey, onSelectFile, onSelectOverview }: Props) {
  const [teams, setTeams] = useState<FigmaTeamRef[]>([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [addingTeam, setAddingTeam] = useState(false)
  const [filter, setFilter] = useState('')

  const loadTeams = () => {
    setTeamsLoading(true)
    ipc
      .figmaTeamsList()
      .then(setTeams)
      .finally(() => setTeamsLoading(false))
  }

  useEffect(loadTeams, [])

  return (
    <aside className="flex h-full w-[264px] shrink-0 flex-col gap-2 p-3 pr-0">
      <div className="no-drag pr-2">
        <button
          type="button"
          onClick={onSelectOverview}
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-control px-3 text-[13px] font-medium transition-colors',
            selectedFileKey === null ? 'bg-surface text-ink' : 'text-muted hover:bg-[var(--sunken)] hover:text-ink',
          )}
        >
          <AppIcon name="AlignLeft" size={16} />
          Обзор пространства
        </button>
      </div>

      <div className="no-drag pr-2">
        <Input
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Поиск по загруженному…"
          className="h-9 text-[13px]"
        />
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto pr-2">
        <div className="rounded-card bg-surface p-2">
          <div className="flex items-center justify-between px-1.5 py-1">
            <h3 className="text-[12px] font-semibold lowercase text-muted">команды</h3>
            <button
              type="button"
              onClick={() => setAddingTeam((v) => !v)}
              className="flex h-6 w-6 items-center justify-center rounded-control text-muted hover:bg-[var(--sunken)] hover:text-ink"
              aria-label="Добавить команду"
              title="Добавить команду"
            >
              <AppIcon name="Plus" size={16} />
            </button>
          </div>

          {addingTeam ? (
            <AddTeamForm
              onAdded={(next) => {
                setTeams(next)
                setAddingTeam(false)
              }}
              onCancel={() => setAddingTeam(false)}
            />
          ) : null}

          {teamsLoading ? (
            <div className="flex justify-center py-4">
              <Spinner className="h-4 w-4" />
            </div>
          ) : teams.length === 0 && !addingTeam ? (
            <p className="px-1.5 py-2 text-[12px] leading-relaxed text-faint">
              Команд пока нет. ID команды — в URL страницы команды в Figma:
              figma.com/files/team/<b>ID</b>/…
            </p>
          ) : (
            <div className="mt-1 space-y-0.5">
              {teams.map((team) => (
                <TeamNode
                  key={team.id}
                  team={team}
                  filter={filter}
                  selectedFileKey={selectedFileKey}
                  onSelectFile={onSelectFile}
                  onRemoved={loadTeams}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

function AddTeamForm({ onAdded, onCancel }: { onAdded: (teams: FigmaTeamRef[]) => void; onCancel: () => void }) {
  const [id, setId] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!id.trim()) {
      setError('Нужен ID команды')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const next = await ipc.figmaTeamsAdd(id, label)
      onAdded(next)
    } catch (err) {
      setError(err instanceof BoxUiError ? err.message : 'Не удалось добавить команду')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mb-1 space-y-1.5 rounded-control bg-[var(--sunken)] p-2">
      <Input
        value={id}
        onChange={(event) => setId(event.target.value)}
        placeholder="ID команды"
        className="h-8 text-[12px]"
        autoFocus
      />
      <Input
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        placeholder="Название (необязательно)"
        className="h-8 text-[12px]"
        onKeyDown={(event) => event.key === 'Enter' && void submit()}
      />
      {error ? <p className="text-[11px] text-[var(--danger)]">{error}</p> : null}
      <div className="flex gap-1.5">
        <Button variant="primary" size="sm" onClick={submit} disabled={busy} className="h-7 px-2.5 text-[11px]">
          {busy ? <Spinner className="h-3 w-3" /> : null}
          Добавить
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-7 px-2.5 text-[11px]">
          Отмена
        </Button>
      </div>
    </div>
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

  const load = () => {
    setLoading(true)
    ipc
      .figmaProjects(team.id)
      .then(setProjects)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (expanded && projects === null) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  const remove = async () => {
    await ipc.figmaTeamsRemove(team.id)
    onRemoved()
  }

  const visibleProjects = filter
    ? (projects ?? []).filter((p) => p.name.toLowerCase().includes(filter.toLowerCase()))
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
          onClick={remove}
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

  const load = () => {
    setLoading(true)
    ipc
      .figmaFiles(project.id)
      .then(setFiles)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (expanded && files === null) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded])

  const visibleFiles = filter
    ? (files ?? []).filter((f) => f.name.toLowerCase().includes(filter.toLowerCase()))
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
