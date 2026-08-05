import { useEffect, useState } from 'react'
import { ipc, BoxUiError } from '@/lib/ipc'
import type { FigmaCacheStats, FigmaDirectoryPerson, FigmaPrefs, FigmaUser } from '@/types'
import { Avatar, Button, Checkbox, Field, Input, Select, Spinner } from '@/components/ui'
import { AppIcon } from '@/components/AppIcon'
import { relativeTime } from './utils'

const WEEKDAYS = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 0, label: 'Вс' },
]

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

export function SettingsPanel({
  user,
  sections,
  onDataChanged,
  onDisconnect,
}: {
  user: FigmaUser
  sections: { value: string; label: string }[]
  onDataChanged: () => void
  onDisconnect: () => void
}) {
  const [prefs, setPrefs] = useState<FigmaPrefs | null>(null)
  const [stats, setStats] = useState<FigmaCacheStats | null>(null)
  const [directory, setDirectory] = useState<FigmaDirectoryPerson[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = () => {
    ipc.figmaPrefs().then(setPrefs)
    ipc.figmaCacheStats().then(setStats)
    ipc.figmaPeopleDirectory().then(setDirectory)
  }

  useEffect(reload, [])

  const patch = async (next: Partial<FigmaPrefs>) => {
    const saved = await ipc.figmaSetPrefs(next)
    setPrefs(saved)
    onDataChanged()
  }

  const toggleWeekend = (day: number) => {
    if (!prefs) return
    const next = prefs.weekendDays.includes(day)
      ? prefs.weekendDays.filter((item) => item !== day)
      : [...prefs.weekendDays, day]
    void patch({ weekendDays: next })
  }

  const exportCsv = async () => {
    setBusy(true)
    setNotice(null)
    try {
      const result = await ipc.figmaExportCsv()
      setNotice(result.saved ? `Выгружено: ${result.path}` : 'Выгрузка отменена')
    } catch (error) {
      setNotice(error instanceof BoxUiError ? error.message : 'Не удалось выгрузить')
    } finally {
      setBusy(false)
    }
  }

  const clearCache = async () => {
    setBusy(true)
    try {
      await ipc.figmaClearCache()
      setNotice('Кэш очищен. Запустите синхронизацию, чтобы собрать историю заново.')
      reload()
      onDataChanged()
    } finally {
      setBusy(false)
    }
  }

  const hidden = directory.filter((person) => person.hidden)

  if (!prefs) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="h-5 w-5" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {notice ? (
        <p className="rounded-card bg-surface p-3 text-[13px] text-ink">{notice}</p>
      ) : null}

      <section className="rounded-card bg-surface p-4">
        <h3 className="mb-1 text-[14px] font-semibold text-ink">Подключение</h3>
        <p className="mb-3 text-[12px] text-muted">
          Токен хранится только на этом компьютере и шифруется средствами операционной системы.
        </p>
        <div className="flex items-center gap-3">
          <Avatar src={user.img_url} name={user.handle} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] text-ink">{user.handle}</p>
            <p className="truncate text-[12px] text-muted">{user.email}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onDisconnect}>
            <AppIcon name="LogOut" size={14} />
            Отключить
          </Button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-card bg-surface p-4">
          <h3 className="mb-1 text-[14px] font-semibold text-ink">Рабочий ритм команды</h3>
          <p className="mb-4 text-[12px] leading-relaxed text-muted">
            От этих порогов зависят метрики «ночной работы», «работы в выходные» и фильтр «только рабочие часы».
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Рабочий день с">
              <Select
                value={String(prefs.workdayStart)}
                onChange={(event) => void patch({ workdayStart: Number(event.target.value) })}
                className="h-9 text-[13px]"
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>{`${String(hour).padStart(2, '0')}:00`}</option>
                ))}
              </Select>
            </Field>
            <Field label="По">
              <Select
                value={String(prefs.workdayEnd)}
                onChange={(event) => void patch({ workdayEnd: Number(event.target.value) })}
                className="h-9 text-[13px]"
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>{`${String(hour).padStart(2, '0')}:00`}</option>
                ))}
              </Select>
            </Field>
            <Field label="Ночь считается с">
              <Select
                value={String(prefs.nightStart)}
                onChange={(event) => void patch({ nightStart: Number(event.target.value) })}
                className="h-9 text-[13px]"
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>{`${String(hour).padStart(2, '0')}:00`}</option>
                ))}
              </Select>
            </Field>
            <Field label="По">
              <Select
                value={String(prefs.nightEnd)}
                onChange={(event) => void patch({ nightEnd: Number(event.target.value) })}
                className="h-9 text-[13px]"
              >
                {HOURS.map((hour) => (
                  <option key={hour} value={hour}>{`${String(hour).padStart(2, '0')}:00`}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="mt-4">
            <p className="mb-1.5 text-xs font-medium text-muted">Выходные дни</p>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleWeekend(day.value)}
                  className={`h-8 w-11 rounded-control text-[13px] transition-colors ${
                    prefs.weekendDays.includes(day.value)
                      ? 'bg-[var(--grass)] text-white'
                      : 'bg-[var(--sunken)] text-muted hover:text-ink'
                  }`}
                  aria-pressed={prefs.weekendDays.includes(day.value)}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-card bg-surface p-4">
          <h3 className="mb-1 text-[14px] font-semibold text-ink">Графики и синхронизация</h3>
          <p className="mb-4 text-[12px] leading-relaxed text-muted">
            Сколько периодов показывать на таймлайнах и как глубоко копать историю при синхронизации.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {(['day', 'week', 'month', 'year'] as const).map((key) => (
              <Field
                key={key}
                label={`Периодов: ${key === 'day' ? 'дни' : key === 'week' ? 'недели' : key === 'month' ? 'месяцы' : 'годы'}`}
              >
                <Input
                  type="number"
                  min={3}
                  max={key === 'day' ? 180 : key === 'week' ? 104 : key === 'month' ? 60 : 20}
                  value={prefs.timelineBuckets[key]}
                  onChange={(event) =>
                    void patch({
                      timelineBuckets: { ...prefs.timelineBuckets, [key]: Number(event.target.value) || 1 },
                    })
                  }
                  className="h-9 text-[13px]"
                />
              </Field>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field label="Глубина истории, страниц" hint="30 версий на страницу">
              <Input
                type="number"
                min={1}
                max={2000}
                value={prefs.syncDepthPages}
                onChange={(event) => void patch({ syncDepthPages: Number(event.target.value) || 1 })}
                className="h-9 text-[13px]"
              />
            </Field>
            <Field label="Файлов параллельно" hint="Больше — быстрее, но выше риск лимитов">
              <Input
                type="number"
                min={1}
                max={12}
                value={prefs.syncConcurrency}
                onChange={(event) => void patch({ syncConcurrency: Number(event.target.value) || 1 })}
                className="h-9 text-[13px]"
              />
            </Field>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <section className="rounded-card bg-surface p-4">
          <h3 className="mb-1 text-[14px] font-semibold text-ink">Интерфейс</h3>
          <p className="mb-4 text-[12px] leading-relaxed text-muted">
            Плотность, стартовый раздел и режим отображения карточек.
          </p>

          <div className="space-y-3">
            <Field label="Плотность">
              <Select
                value={prefs.density}
                onChange={(event) => void patch({ density: event.target.value as 'compact' | 'comfortable' })}
                className="h-9 text-[13px]"
              >
                <option value="comfortable">Просторная</option>
                <option value="compact">Компактная</option>
              </Select>
            </Field>

            <Field label="Раздел при открытии">
              <Select
                value={prefs.defaultSection}
                onChange={(event) => void patch({ defaultSection: event.target.value })}
                className="h-9 text-[13px]"
              >
                {sections.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Checkbox
              checked={prefs.tablesByDefault}
              onChange={() => void patch({ tablesByDefault: !prefs.tablesByDefault })}
              label="Открывать карточки сразу таблицей значений"
            />
          </div>
        </section>

        <section className="rounded-card bg-surface p-4">
          <h3 className="mb-1 text-[14px] font-semibold text-ink">Пороги инсайтов</h3>
          <p className="mb-4 text-[12px] leading-relaxed text-muted">
            С какого момента наблюдение попадает в раздел «Инсайты» как отдельный вывод.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Файл заброшен, дней">
              <Input
                type="number"
                min={1}
                max={365}
                value={prefs.insightThresholds.staleDays}
                onChange={(event) =>
                  void patch({
                    insightThresholds: {
                      ...prefs.insightThresholds,
                      staleDays: Number(event.target.value) || 1,
                    },
                  })
                }
                className="h-9 text-[13px]"
              />
            </Field>
            <Field label="Без ответа, дней">
              <Input
                type="number"
                min={1}
                max={180}
                value={prefs.insightThresholds.unansweredDays}
                onChange={(event) =>
                  void patch({
                    insightThresholds: {
                      ...prefs.insightThresholds,
                      unansweredDays: Number(event.target.value) || 1,
                    },
                  })
                }
                className="h-9 text-[13px]"
              />
            </Field>
            <Field label="Концентрация, %">
              <Input
                type="number"
                min={10}
                max={100}
                value={prefs.insightThresholds.concentrationPercent}
                onChange={(event) =>
                  void patch({
                    insightThresholds: {
                      ...prefs.insightThresholds,
                      concentrationPercent: Number(event.target.value) || 10,
                    },
                  })
                }
                className="h-9 text-[13px]"
              />
            </Field>
            <Field label="Значимое изменение, %">
              <Input
                type="number"
                min={5}
                max={100}
                value={prefs.insightThresholds.dropPercent}
                onChange={(event) =>
                  void patch({
                    insightThresholds: {
                      ...prefs.insightThresholds,
                      dropPercent: Number(event.target.value) || 5,
                    },
                  })
                }
                className="h-9 text-[13px]"
              />
            </Field>
            <Field label="Ночная работа, %">
              <Input
                type="number"
                min={5}
                max={100}
                value={prefs.insightThresholds.nightSharePercent}
                onChange={(event) =>
                  void patch({
                    insightThresholds: {
                      ...prefs.insightThresholds,
                      nightSharePercent: Number(event.target.value) || 5,
                    },
                  })
                }
                className="h-9 text-[13px]"
              />
            </Field>
          </div>
        </section>
      </div>

      <section className="rounded-card bg-surface p-4">
        <h3 className="mb-3 text-[14px] font-semibold text-ink">Собранные данные</h3>
        {stats ? (
          <>
            <div className="grid grid-cols-6 gap-3">
              <Stat label="Файлов" value={stats.files.toLocaleString('ru')} />
              <Stat label="Версий" value={stats.versions.toLocaleString('ru')} />
              <Stat label="Комментариев" value={stats.comments.toLocaleString('ru')} />
              <Stat label="Реакций" value={stats.reactions.toLocaleString('ru')} />
              <Stat label="Неполная история" value={String(stats.incompleteFiles)} />
              <Stat label="Размер кэша" value={`${(stats.bytes / 1024 / 1024).toFixed(1)} МБ`} />
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-muted">
              История с {stats.oldestEvent ? new Date(stats.oldestEvent).toLocaleDateString('ru') : '—'} по{' '}
              {stats.newestEvent ? new Date(stats.newestEvent).toLocaleDateString('ru') : '—'}
              {stats.lastFetchedAt
                ? ` · последняя синхронизация ${relativeTime(new Date(stats.lastFetchedAt).toISOString())}`
                : ''}
              {stats.incompleteFiles > 0
                ? ` · у ${stats.incompleteFiles} файлов история обрезана потолком глубины — поднимите значение и синхронизируйте заново`
                : ''}
            </p>
            <p className="mt-1 truncate text-[12px] text-faint" title={stats.directory}>
              {stats.directory}
            </p>
          </>
        ) : (
          <Spinner className="h-4 w-4" />
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="soft" size="sm" onClick={exportCsv} disabled={busy}>
            <AppIcon name="ExternalLink" size={14} />
            Выгрузить события в CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={clearCache} disabled={busy}>
            <AppIcon name="Trash2" size={14} />
            Очистить кэш
          </Button>
        </div>
      </section>

      <section className="rounded-card bg-surface p-4">
        <h3 className="mb-1 text-[14px] font-semibold text-ink">Участники в аналитике</h3>
        <p className="mb-3 text-[12px] text-muted">
          Скрытые исключены из всех метрик раздела. Нажмите на карточку, чтобы переключить.
        </p>
        <div className="scroll-thin max-h-[280px] space-y-0.5 overflow-y-auto pr-1">
          {directory.map((person) => (
            <Checkbox
              key={person.handle}
              checked={!person.hidden}
              onChange={async () => {
                const next = person.hidden
                  ? hidden.filter((item) => item.handle !== person.handle).map((item) => item.handle)
                  : [...hidden.map((item) => item.handle), person.handle]
                await ipc.figmaSetHiddenUsers(next)
                reload()
                onDataChanged()
              }}
              label={`${person.handle} · ${person.events.toLocaleString('ru')} событий`}
            />
          ))}
          {directory.length === 0 ? <p className="text-[13px] text-muted">Нет данных</p> : null}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-muted">{label}</p>
      <p className="mt-0.5 font-display display-sm text-ink">{value}</p>
    </div>
  )
}
