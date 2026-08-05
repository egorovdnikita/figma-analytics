import { useMemo, useState } from 'react'
import { format, subDays, subMonths, subYears, startOfYear } from 'date-fns'
import type {
  FigmaEvent,
  FigmaEventKind,
  FigmaFilterPreset,
  FigmaSyncProgress,
  FigmaTeamRef,
} from '@/types'
import { Button, Checkbox, Input, Modal, Segmented, Select } from '@/components/ui'
import { AppIcon } from '@/components/AppIcon'
import { CrossGlyph } from '@/components/Glyphs'
import { SyncProgressInline } from './FigmaWorkspace'
import { cn } from '@/lib/cn'
import {
  DEFAULT_FILTERS,
  EVENT_COLOR_VAR,
  EVENT_KINDS,
  EVENT_LABELS,
  FigmaFilters,
  GRANULARITY_OPTIONS,
  Granularity,
  filtersActive,
} from './analytics'

const iso = (date: Date) => format(date, 'yyyy-MM-dd')

const RANGE_PRESETS: { value: string; label: string; resolve: () => { from: string | null; to: string | null } }[] = [
  { value: 'rolling', label: 'Скользящее окно', resolve: () => ({ from: null, to: null }) },
  { value: '7', label: 'Последние 7 дней', resolve: () => ({ from: iso(subDays(new Date(), 7)), to: iso(new Date()) }) },
  { value: '30', label: 'Последние 30 дней', resolve: () => ({ from: iso(subDays(new Date(), 30)), to: iso(new Date()) }) },
  { value: '90', label: 'Последние 90 дней', resolve: () => ({ from: iso(subDays(new Date(), 90)), to: iso(new Date()) }) },
  { value: '180', label: 'Последние 6 месяцев', resolve: () => ({ from: iso(subMonths(new Date(), 6)), to: iso(new Date()) }) },
  { value: '365', label: 'Последние 12 месяцев', resolve: () => ({ from: iso(subYears(new Date(), 1)), to: iso(new Date()) }) },
  { value: 'ytd', label: 'С начала года', resolve: () => ({ from: iso(startOfYear(new Date())), to: iso(new Date()) }) },
  { value: 'all', label: 'Вся история', resolve: () => ({ from: null, to: null }) },
]

export function FilterBar({
  filters,
  onChange,
  events,
  teams,
  windowLabel,
  presets,
  onSavePreset,
  onDeletePreset,
  matchedCount,
  totalCount,
  syncing,
  progress,
}: {
  filters: FigmaFilters
  onChange: (next: FigmaFilters) => void
  /** Нефильтрованный поток — из него берём списки проектов и людей для выбора. */
  events: FigmaEvent[]
  teams: FigmaTeamRef[]
  windowLabel: string
  presets: FigmaFilterPreset[]
  onSavePreset: (name: string) => void
  onDeletePreset: (id: string) => void
  matchedCount: number
  totalCount: number
  syncing: boolean
  progress: FigmaSyncProgress | null
}) {
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState('rolling')
  const [presetName, setPresetName] = useState('')

  const projects = useMemo(() => {
    const map = new Map<string, string>()
    for (const event of events) if (event.projectId) map.set(event.projectId, event.projectName)
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
  }, [events])

  const people = useMemo(() => {
    const map = new Map<string, number>()
    for (const event of events) if (event.handle) map.set(event.handle, (map.get(event.handle) ?? 0) + 1)
    return [...map.entries()].map(([handle, count]) => ({ handle, count })).sort((a, b) => b.count - a.count)
  }, [events])

  const activeCount =
    filters.teams.length +
    filters.projects.length +
    filters.people.length +
    (filters.kinds.length !== EVENT_KINDS.length ? 1 : 0) +
    (filters.from || filters.to ? 1 : 0) +
    (filters.workdaysOnly ? 1 : 0) +
    (filters.workHoursOnly ? 1 : 0)

  const applyPreset = (value: string) => {
    setPreset(value)
    const found = RANGE_PRESETS.find((item) => item.value === value)
    if (!found) return
    onChange({ ...filters, ...found.resolve() })
  }

  const toggle = <K extends 'teams' | 'projects' | 'people'>(key: K, value: string) => {
    const list = filters[key]
    onChange({
      ...filters,
      [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
    })
  }

  const toggleKind = (kind: FigmaEventKind) => {
    const next = filters.kinds.includes(kind)
      ? filters.kinds.filter((item) => item !== kind)
      : [...filters.kinds, kind]
    onChange({ ...filters, kinds: next.length === 0 ? [...EVENT_KINDS] : next })
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-card bg-surface p-2">
        {syncing && progress ? (
          <SyncProgressInline progress={progress} />
        ) : (
          <>
            <Segmented
              value={filters.granularity}
              onChange={(value) => onChange({ ...filters, granularity: value as Granularity })}
              options={GRANULARITY_OPTIONS}
              className="ml-1 bg-[var(--sunken)]"
            />

            <div className="w-[186px]">
              <Select value={preset} onChange={(event) => applyPreset(event.target.value)} className="h-9 text-[14px]">
                {RANGE_PRESETS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </div>

            {presets.length > 0 ? (
              <div className="w-[168px]">
                <Select
                  value=""
                  onChange={(event) => {
                    const found = presets.find((item) => item.id === event.target.value)
                    if (found) onChange(found.filters as FigmaFilters)
                  }}
                  className="h-9 text-[14px]"
                >
                  <option value="">Наборы…</option>
                  {presets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            <span className="text-[13px] text-muted">
              {filters.from || filters.to
                ? `${filters.from ?? '…'} — ${filters.to ?? 'сегодня'}`
                : `сравнение ${windowLabel}`}
            </span>

            <span className="text-[13px] text-faint [font-variant-numeric:tabular-nums]">
              {matchedCount.toLocaleString('ru')} из {totalCount.toLocaleString('ru')}
            </span>

            <div className="ml-auto flex items-center gap-2">
              {filtersActive(filters) ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPreset('rolling')
                    onChange({ ...DEFAULT_FILTERS, granularity: filters.granularity })
                  }}
                >
                  Сбросить
                </Button>
              ) : null}
              <Button variant={activeCount > 0 ? 'soft' : 'ghost'} size="sm" onClick={() => setOpen(true)}>
                <AppIcon name="AlignLeft" size={16} />
                Фильтры
                {activeCount > 0 ? (
                  <span className="ml-0.5 rounded-chip bg-[var(--grass)] px-1.5 text-[12px] text-white">
                    {activeCount}
                  </span>
                ) : null}
              </Button>
            </div>
          </>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Фильтры аналитики"
        width={720}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setPreset('rolling')
                onChange({ ...DEFAULT_FILTERS, granularity: filters.granularity })
              }}
            >
              Сбросить всё
            </Button>
            <Button variant="primary" onClick={() => setOpen(false)}>
              Готово
            </Button>
          </>
        }
      >
        <div className="space-y-5 pb-2">
          <section>
            <h4 className="mb-2 text-[13px] font-semibold text-ink">Произвольный период</h4>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={filters.from ?? ''}
                onChange={(event) => onChange({ ...filters, from: event.target.value || null })}
                className="h-9 text-[13px]"
              />
              <span className="text-[13px] text-muted">—</span>
              <Input
                type="date"
                value={filters.to ?? ''}
                onChange={(event) => onChange({ ...filters, to: event.target.value || null })}
                className="h-9 text-[13px]"
              />
            </div>
            <p className="mt-1.5 text-[12px] text-muted">
              Пусто — используется скользящее окно выбранной гранулярности.
            </p>
          </section>

          <section>
            <h4 className="mb-2 text-[13px] font-semibold text-ink">Сохранённые наборы</h4>
            <p className="mb-2 text-[12px] text-muted">
              Текущая комбинация фильтров сохраняется под именем и остаётся доступной после перезапуска.
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                placeholder="Название набора"
                className="h-9 text-[13px]"
              />
              <Button
                variant="soft"
                size="sm"
                disabled={!presetName.trim()}
                onClick={() => {
                  onSavePreset(presetName.trim())
                  setPresetName('')
                }}
              >
                Сохранить
              </Button>
            </div>
            {presets.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {presets.map((item) => (
                  <span
                    key={item.id}
                    className="flex h-7 items-center gap-1.5 rounded-chip bg-[var(--sunken)] px-2.5 text-[13px] text-muted"
                  >
                    <button type="button" onClick={() => onChange(item.filters as FigmaFilters)} className="hover:text-ink">
                      {item.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePreset(item.id)}
                      className="text-faint hover:text-ink"
                      aria-label={`Удалить набор ${item.name}`}
                    >
                      <CrossGlyph size={12} />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section>
            <h4 className="mb-2 text-[13px] font-semibold text-ink">Типы событий</h4>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => toggleKind(kind)}
                  className={cn(
                    'flex h-7 items-center gap-1.5 rounded-chip px-2.5 text-[13px] transition-colors',
                    filters.kinds.includes(kind)
                      ? 'bg-[var(--sunken)] text-ink'
                      : 'text-faint hover:text-muted',
                  )}
                  aria-pressed={filters.kinds.includes(kind)}
                >
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: EVENT_COLOR_VAR[kind] }} />
                  {EVENT_LABELS[kind]}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-[13px] font-semibold text-ink">Режим работы</h4>
            <div className="space-y-1">
              <Checkbox
                checked={filters.workdaysOnly}
                onChange={() => onChange({ ...filters, workdaysOnly: !filters.workdaysOnly })}
                label="Только будни — исключить выходные"
              />
              <Checkbox
                checked={filters.workHoursOnly}
                onChange={() => onChange({ ...filters, workHoursOnly: !filters.workHoursOnly })}
                label="Только рабочие часы (задаются в настройках)"
              />
            </div>
          </section>

          {teams.length > 1 ? (
            <section>
              <h4 className="mb-2 text-[13px] font-semibold text-ink">
                Команды {filters.teams.length > 0 ? `(${filters.teams.length})` : ''}
              </h4>
              <div className="space-y-0.5">
                {teams.map((team) => (
                  <Checkbox
                    key={team.id}
                    checked={filters.teams.includes(team.id)}
                    onChange={() => toggle('teams', team.id)}
                    label={team.label || team.id}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h4 className="mb-2 text-[13px] font-semibold text-ink">
              Проекты {filters.projects.length > 0 ? `(${filters.projects.length})` : ''}
            </h4>
            <div className="scroll-thin scroll-soft max-h-[180px] space-y-0.5 overflow-y-auto pr-2">
              {projects.map((project) => (
                <Checkbox
                  key={project.id}
                  checked={filters.projects.includes(project.id)}
                  onChange={() => toggle('projects', project.id)}
                  label={project.name}
                />
              ))}
              {projects.length === 0 ? <p className="text-[13px] text-muted">Нет данных</p> : null}
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-[13px] font-semibold text-ink">
              Участники {filters.people.length > 0 ? `(${filters.people.length})` : ''}
            </h4>
            <div className="scroll-thin scroll-soft max-h-[220px] space-y-0.5 overflow-y-auto pr-2">
              {people.map((person) => (
                <Checkbox
                  key={person.handle}
                  checked={filters.people.includes(person.handle)}
                  onChange={() => toggle('people', person.handle)}
                  label={`${person.handle} · ${person.count}`}
                />
              ))}
              {people.length === 0 ? <p className="text-[13px] text-muted">Нет данных</p> : null}
            </div>
          </section>
        </div>
      </Modal>
    </>
  )
}
