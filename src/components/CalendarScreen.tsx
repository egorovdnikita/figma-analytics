import { useCallback, useEffect, useMemo, useState } from 'react'
import { addHours, startOfHour } from 'date-fns'
import { useApp } from '@/state/store'
import { rangeFor } from '@/lib/date'
import { Topbar } from '@/components/Topbar'
import { TimeGridView } from '@/components/views/TimeGridView'
import { MonthView } from '@/components/views/MonthView'
import { AgendaView } from '@/components/views/AgendaView'
import { EventDialog, type DialogSeed } from '@/components/EventDialog'
import type { CalendarEvent } from '@/types'

export function CalendarScreen({
  createSignal,
  onCreateHandled,
}: {
  createSignal: number
  onCreateHandled: () => void
}) {
  const { view, setView, anchor, setAnchor, events, settings } = useApp()
  const [dialogEvent, setDialogEvent] = useState<CalendarEvent | null>(null)
  const [dialogSeed, setDialogSeed] = useState<DialogSeed | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const range = useMemo(
    () => rangeFor(view, anchor, settings.firstDayOfWeek),
    [view, anchor, settings.firstDayOfWeek],
  )

  const days = useMemo(() => {
    if (view === 'week' && !settings.showWeekends) {
      return range.days.filter((day) => day.getDay() !== 0 && day.getDay() !== 6)
    }
    return range.days
  }, [range.days, view, settings.showWeekends])

  const visibleEvents = useMemo(() => {
    if (settings.showDeclined) return events
    return events.filter(
      (event) => !event.attendees?.some((a) => a.self && a.responseStatus === 'declined'),
    )
  }, [events, settings.showDeclined])

  const openEvent = useCallback((event: CalendarEvent) => {
    setDialogEvent(event)
    setDialogSeed(null)
    setDialogOpen(true)
  }, [])

  const openCreate = useCallback((start: Date, end: Date, allDay: boolean) => {
    setDialogEvent(null)
    setDialogSeed({ start, end, allDay })
    setDialogOpen(true)
  }, [])

  const quickCreate = useCallback(() => {
    const start = addHours(startOfHour(new Date()), 1)
    openCreate(start, addHours(start, 1), false)
  }, [openCreate])

  useEffect(() => {
    if (createSignal > 0) {
      quickCreate()
      onCreateHandled()
    }
  }, [createSignal, quickCreate, onCreateHandled])

  // Горячие клавиши
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing =
        target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return
      if (dialogOpen) return

      switch (event.key.toLowerCase()) {
        case 'd':
        case 'в':
          setView('day')
          break
        case 'w':
        case 'ц':
          setView('week')
          break
        case 'm':
        case 'ь':
          setView('month')
          break
        case 'a':
        case 'ф':
          setView('agenda')
          break
        case 't':
        case 'е':
          setAnchor(new Date())
          break
        case 'c':
        case 'с':
          event.preventDefault()
          quickCreate()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dialogOpen, quickCreate, setAnchor, setView])

  return (
    <div className="flex h-full min-w-0 flex-col">
      <Topbar />
      <main className="min-h-0 flex-1 p-4 pt-3">
        {view === 'month' ? (
          <MonthView
            days={range.days}
            anchor={anchor}
            events={visibleEvents}
            onOpenEvent={openEvent}
            onCreateRange={openCreate}
          />
        ) : view === 'agenda' ? (
          <AgendaView days={range.days} events={visibleEvents} onOpenEvent={openEvent} />
        ) : (
          <TimeGridView
            days={days}
            events={visibleEvents}
            onOpenEvent={openEvent}
            onCreateRange={openCreate}
          />
        )}
      </main>

      <EventDialog
        open={dialogOpen}
        event={dialogEvent}
        seed={dialogSeed}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  )
}
