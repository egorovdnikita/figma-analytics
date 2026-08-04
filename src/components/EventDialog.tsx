import { useEffect, useMemo, useState } from 'react'
import { addDays, format, parse } from 'date-fns'
import { useApp } from '@/state/store'
import { AppIcon } from '@/components/AppIcon'
import { ipc } from '@/lib/ipc'
import {
  eventEnd,
  eventStart,
  formatEventRange,
  isAllDay,
  locale,
  toDateInput,
  toTimeInput,
} from '@/lib/date'
import { EVENT_COLORS, eventColor } from '@/lib/colors'
import { RECURRENCE_PRESETS, describeRecurrence, presetFromRules, rulesFromPreset } from '@/lib/recurrence'
import { cn } from '@/lib/cn'
import { Button, Chip, Field, Input, Modal, Select, Spinner, Switch, Textarea } from '@/components/ui'
import type { CalendarEvent } from '@/types'

export interface DialogSeed {
  start: Date
  end: Date
  allDay: boolean
}

interface FormState {
  calendarId: string
  summary: string
  description: string
  location: string
  allDay: boolean
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  colorId: string
  attendees: string
  recurrence: string
  reminder: string
  visibility: 'default' | 'public' | 'private'
  transparency: 'opaque' | 'transparent'
}

const REMINDERS = [
  { value: 'default', label: 'Как в календаре' },
  { value: 'none', label: 'Без уведомления' },
  { value: '0', label: 'В момент начала' },
  { value: '5', label: 'За 5 минут' },
  { value: '10', label: 'За 10 минут' },
  { value: '30', label: 'За 30 минут' },
  { value: '60', label: 'За час' },
  { value: '1440', label: 'За сутки' },
]

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

function seedForm(
  event: CalendarEvent | null,
  seed: DialogSeed | null,
  defaultCalendarId: string,
): FormState {
  if (event) {
    const allDay = isAllDay(event)
    const start = eventStart(event)
    const end = allDay ? addDays(eventEnd(event), -1) : eventEnd(event)
    const override = event.reminders?.overrides?.[0]
    return {
      calendarId: event.calendarId,
      summary: event.summary ?? '',
      description: event.description ?? '',
      location: event.location ?? '',
      allDay,
      startDate: toDateInput(start),
      startTime: toTimeInput(start),
      endDate: toDateInput(end),
      endTime: toTimeInput(end),
      colorId: event.colorId ?? '',
      attendees: (event.attendees ?? []).map((a) => a.email).join(', '),
      recurrence: presetFromRules(event.recurrence),
      reminder: event.reminders?.useDefault ? 'default' : override ? String(override.minutes) : 'none',
      visibility: (event.visibility as FormState['visibility']) ?? 'default',
      transparency: (event.transparency as FormState['transparency']) ?? 'opaque',
    }
  }

  const start = seed?.start ?? new Date()
  const end = seed?.end ?? new Date(start.getTime() + 3_600_000)
  return {
    calendarId: defaultCalendarId,
    summary: '',
    description: '',
    location: '',
    allDay: seed?.allDay ?? false,
    startDate: toDateInput(start),
    startTime: toTimeInput(start),
    endDate: toDateInput(end),
    endTime: toTimeInput(end),
    colorId: '',
    attendees: '',
    recurrence: 'none',
    reminder: 'default',
    visibility: 'default',
    transparency: 'opaque',
  }
}

export function EventDialog({
  open,
  event,
  seed,
  onClose,
}: {
  open: boolean
  event: CalendarEvent | null
  seed: DialogSeed | null
  onClose: () => void
}) {
  const { calendars, createEvent, updateEvent, deleteEvent, respond, settings, setNotice } = useApp()

  const writable = calendars.filter((c) => c.accessRole === 'owner' || c.accessRole === 'writer')
  const defaultCalendarId =
    calendars.find((c) => c.primary)?.id ?? writable[0]?.id ?? calendars[0]?.id ?? 'primary'

  const [mode, setMode] = useState<'view' | 'edit'>(event ? 'view' : 'edit')
  const [form, setForm] = useState<FormState>(() => seedForm(event, seed, defaultCalendarId))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setMode(event ? 'view' : 'edit')
    setForm(seedForm(event, seed, defaultCalendarId))
  }, [open, event, seed, defaultCalendarId])

  const readOnly = useMemo(() => {
    if (!event) return false
    const calendar = calendars.find((c) => c.id === event.calendarId)
    return !calendar || (calendar.accessRole !== 'owner' && calendar.accessRole !== 'writer')
  }, [event, calendars])

  const patch = (value: Partial<FormState>) => setForm((prev) => ({ ...prev, ...value }))

  const buildBody = () => {
    const startDate = parse(form.startDate, 'yyyy-MM-dd', new Date())
    const endDate = parse(form.endDate, 'yyyy-MM-dd', new Date())

    const start = form.allDay
      ? { date: format(startDate, 'yyyy-MM-dd') }
      : {
          dateTime: parse(
            `${form.startDate} ${form.startTime}`,
            'yyyy-MM-dd HH:mm',
            new Date(),
          ).toISOString(),
          timeZone,
        }

    const end = form.allDay
      ? { date: format(addDays(endDate, 1), 'yyyy-MM-dd') }
      : {
          dateTime: parse(
            `${form.endDate} ${form.endTime}`,
            'yyyy-MM-dd HH:mm',
            new Date(),
          ).toISOString(),
          timeZone,
        }

    const attendees = form.attendees
      .split(/[,;\s]+/)
      .map((value) => value.trim())
      .filter((value) => value.includes('@'))
      .map((email) => ({ email }))

    const reminders =
      form.reminder === 'default'
        ? { useDefault: true }
        : form.reminder === 'none'
          ? { useDefault: false, overrides: [] }
          : { useDefault: false, overrides: [{ method: 'popup', minutes: Number(form.reminder) }] }

    return {
      summary: form.summary.trim() || 'Без названия',
      description: form.description.trim() || undefined,
      location: form.location.trim() || undefined,
      start,
      end,
      colorId: form.colorId || undefined,
      attendees: attendees.length ? attendees : undefined,
      recurrence: rulesFromPreset(form.recurrence, event?.recurrence),
      reminders,
      visibility: form.visibility === 'default' ? undefined : form.visibility,
      transparency: form.transparency,
    }
  }

  const validate = () => {
    const startTs = parse(
      `${form.startDate} ${form.allDay ? '00:00' : form.startTime}`,
      'yyyy-MM-dd HH:mm',
      new Date(),
    ).getTime()
    const endTs = parse(
      `${form.endDate} ${form.allDay ? '00:00' : form.endTime}`,
      'yyyy-MM-dd HH:mm',
      new Date(),
    ).getTime()
    if (Number.isNaN(startTs) || Number.isNaN(endTs)) return 'Проверьте дату и время'
    if (endTs < startTs) return 'Событие заканчивается раньше, чем начинается'
    return null
  }

  const handleSave = async () => {
    const error = validate()
    if (error) {
      setNotice({ kind: 'error', text: error })
      return
    }
    setBusy(true)
    try {
      const body = buildBody()
      if (event) {
        // Смена календаря через PATCH не поддерживается — создаём заново.
        if (event.calendarId !== form.calendarId) {
          await createEvent(form.calendarId, body)
          await deleteEvent(event.calendarId, event.id)
        } else {
          await updateEvent(event.calendarId, event.id, body)
        }
      } else {
        await createEvent(form.calendarId, body)
      }
      onClose()
    } catch (err) {
      setNotice({ kind: 'error', text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!event) return
    setBusy(true)
    try {
      await deleteEvent(event.calendarId, event.id)
      onClose()
    } catch (err) {
      setNotice({ kind: 'error', text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'view' ? (event?.summary || 'Без названия') : event ? 'Изменить событие' : 'Новое событие'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={mode === 'view' ? 520 : 600}
      footer={
        mode === 'view' ? (
          <ViewFooter
            event={event}
            readOnly={readOnly}
            busy={busy}
            onEdit={() => setMode('edit')}
            onDelete={handleDelete}
          />
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Отмена
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={busy}>
              {busy ? <Spinner /> : null}
              {event ? 'Сохранить' : 'Создать'}
            </Button>
          </>
        )
      }
    >
      {mode === 'view' && event ? (
        <EventDetails event={event} onRespond={respond} timeFormat={settings.timeFormat} />
      ) : (
        <div className="space-y-4 pb-4 pt-1">
          <Input
            autoFocus
            value={form.summary}
            onChange={(e) => patch({ summary: e.target.value })}
            placeholder="Название события"
            className="h-12 text-[16px] font-medium"
          />

          <div className="flex items-center justify-between rounded-control bg-[var(--sunken)] px-4 py-3">
            <span className="text-sm text-ink">Весь день</span>
            <Switch
              checked={form.allDay}
              onChange={(value) => patch({ allDay: value })}
              label="Весь день"
            />
          </div>

          <div className="space-y-3">
            <Field label="Начало">
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => patch({ startDate: e.target.value })}
                  className="min-w-0 flex-1"
                />
                {!form.allDay ? (
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => patch({ startTime: e.target.value })}
                    className="w-[150px] shrink-0 px-2"
                  />
                ) : null}
              </div>
            </Field>
            <Field label="Окончание">
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => patch({ endDate: e.target.value })}
                  className="min-w-0 flex-1"
                />
                {!form.allDay ? (
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => patch({ endTime: e.target.value })}
                    className="w-[150px] shrink-0 px-2"
                  />
                ) : null}
              </div>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Календарь">
              <Select
                value={form.calendarId}
                onChange={(e) => patch({ calendarId: e.target.value })}
              >
                {(writable.length ? writable : calendars).map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.summaryOverride ?? calendar.summary}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Повторение">
              <Select
                value={form.recurrence}
                onChange={(e) => patch({ recurrence: e.target.value })}
              >
                {RECURRENCE_PRESETS.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
                {form.recurrence === 'custom' ? (
                  <option value="custom">Своё правило (без изменений)</option>
                ) : null}
              </Select>
            </Field>
          </div>

          <Field label="Место">
            <Input
              value={form.location}
              onChange={(e) => patch({ location: e.target.value })}
              placeholder="Адрес или ссылка на встречу"
            />
          </Field>

          <Field label="Участники" hint="Через запятую. Приглашения отправит Google.">
            <Input
              value={form.attendees}
              onChange={(e) => patch({ attendees: e.target.value })}
              placeholder="name@example.com, team@example.com"
            />
          </Field>

          <Field label="Описание">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Повестка, ссылки, заметки"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Уведомление">
              <Select value={form.reminder} onChange={(e) => patch({ reminder: e.target.value })}>
                {REMINDERS.map((reminder) => (
                  <option key={reminder.value} value={reminder.value}>
                    {reminder.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Статус занятости">
              <Select
                value={form.transparency}
                onChange={(e) => patch({ transparency: e.target.value as FormState['transparency'] })}
              >
                <option value="opaque">Занят</option>
                <option value="transparent">Свободен</option>
              </Select>
            </Field>
          </div>

          <Field label="Доступ">
            <Select
              value={form.visibility}
              onChange={(e) => patch({ visibility: e.target.value as FormState['visibility'] })}
            >
              <option value="default">Как в календаре</option>
              <option value="public">Открытое</option>
              <option value="private">Личное</option>
            </Select>
          </Field>

          <Field label="Цвет">
            <div className="flex flex-wrap items-center gap-1.5">
              <ColorSwatch
                active={form.colorId === ''}
                color={calendars.find((c) => c.id === form.calendarId)?.backgroundColor ?? '#7cc49b'}
                label="Как у календаря"
                onClick={() => patch({ colorId: '' })}
              />
              {Object.entries(EVENT_COLORS).map(([id, color]) => (
                <ColorSwatch
                  key={id}
                  active={form.colorId === id}
                  color={color.hex}
                  label={color.label}
                  onClick={() => patch({ colorId: id })}
                />
              ))}
            </div>
          </Field>
        </div>
      )}
    </Modal>
  )
}

function ColorSwatch({
  color,
  active,
  label,
  onClick,
}: {
  color: string
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded-full transition-transform',
        active ? 'scale-110 ring-2 ring-[var(--ink)] ring-offset-2 ring-offset-[var(--surface)]' : '',
      )}
      style={{ background: color }}
    >
      {active ? <AppIcon name="Check" size={14} color="#fff" /> : null}
    </button>
  )
}

function ViewFooter({
  event,
  readOnly,
  busy,
  onEdit,
  onDelete,
}: {
  event: CalendarEvent | null
  readOnly: boolean
  busy: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <>
      {event?.htmlLink ? (
        <Button
          variant="ghost"
          onClick={() => void ipc.openExternal(event.htmlLink!)}
          className="mr-auto"
        >
          <AppIcon name="ExternalLink" size={16} />
          В Google Календаре
        </Button>
      ) : null}
      {!readOnly ? (
        <>
          <Button variant="danger" onClick={onDelete} disabled={busy}>
            <AppIcon name="Trash2" size={16} />
            Удалить
          </Button>
          <Button variant="primary" onClick={onEdit}>
            Изменить
          </Button>
        </>
      ) : (
        <Chip>Только просмотр</Chip>
      )}
    </>
  )
}

function EventDetails({
  event,
  onRespond,
  timeFormat,
}: {
  event: CalendarEvent
  onRespond: (calendarId: string, eventId: string, response: string) => Promise<void>
  timeFormat: '24h' | '12h'
}) {
  const { calendars, resolvedTheme } = useApp()
  const color = eventColor(event, calendars)
  const calendar = calendars.find((c) => c.id === event.calendarId)
  const self = event.attendees?.find((a) => a.self)
  const recurrence = describeRecurrence(event.recurrence)

  return (
    <div className="space-y-4 pb-4 pt-1">
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={{ background: color }} />
        <span className="text-[13px] text-muted">
          {calendar?.summaryOverride ?? calendar?.summary ?? event.calendarId}
        </span>
      </div>

      <Row icon={<AppIcon name="CalendarClock" size={17} />}>
        <div>
          <div className="text-[14px] text-ink">{formatEventRange(event, timeFormat)}</div>
          <div className="text-[12px] text-muted">
            {format(new Date(event.start.dateTime ?? `${event.start.date}T00:00:00`), 'EEEE, d MMMM yyyy', {
              locale,
            })}
          </div>
        </div>
      </Row>

      {recurrence ? <Row icon={<AppIcon name="Repeat" size={17} />}>{recurrence}</Row> : null}

      {event.location ? (
        <Row icon={<AppIcon name="MapPin" size={17} />}>{event.location}</Row>
      ) : null}

      {event.hangoutLink ? (
        <Row icon={<AppIcon name="Video" size={17} />}>
          <button
            type="button"
            className="text-[var(--lilac)] hover:underline"
            onClick={() => void ipc.openExternal(event.hangoutLink!)}
          >
            Присоединиться к встрече
          </button>
        </Row>
      ) : null}

      {event.description ? (
        <Row icon={<AppIcon name="AlignLeft" size={17} />}>
          <div
            className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink"
            // Google возвращает описание с базовым HTML; показываем как текст.
          >
            {event.description.replace(/<[^>]+>/g, '')}
          </div>
        </Row>
      ) : null}

      {event.attendees?.length ? (
        <Row icon={<AppIcon name="Users" size={17} />}>
          <div className="space-y-1.5">
            <div className="text-[13px] text-muted">{event.attendees.length} участников</div>
            {event.attendees.slice(0, 8).map((attendee) => (
              <div key={attendee.email} className="flex items-center gap-2 text-[13px] text-ink">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background:
                      attendee.responseStatus === 'accepted'
                        ? 'var(--grass)'
                        : attendee.responseStatus === 'declined'
                          ? 'var(--danger)'
                          : 'var(--faint)',
                  }}
                />
                <span className="truncate">{attendee.displayName ?? attendee.email}</span>
                {attendee.organizer ? <Chip>организатор</Chip> : null}
              </div>
            ))}
          </div>
        </Row>
      ) : null}

      {event.reminders?.overrides?.length ? (
        <Row icon={<AppIcon name="Bell" size={17} />}>
          {event.reminders.overrides
            .map((reminder) => `за ${reminder.minutes} мин`)
            .join(', ')}
        </Row>
      ) : null}

      {self ? (
        <div className="rounded-control bg-[var(--sunken)] p-3">
          <div className="mb-2 text-[13px] text-muted">Ваш ответ</div>
          <div className="flex gap-2">
            {(
              [
                ['accepted', 'Буду'],
                ['tentative', 'Возможно'],
                ['declined', 'Не буду'],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={self.responseStatus === value ? 'primary' : 'outline'}
                onClick={() => void onRespond(event.calendarId, event.id, value)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-faint">{icon}</span>
      <div className="min-w-0 flex-1 text-[14px] text-ink">{children}</div>
    </div>
  )
}
