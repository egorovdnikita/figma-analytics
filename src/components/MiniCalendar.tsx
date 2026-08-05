import { useMemo, useState } from 'react'
import { addMonths, format, isSameDay, isSameMonth, startOfMonth } from 'date-fns'
import { eachDay, locale, rangeFor } from '@/lib/date'
import { cn } from '@/lib/cn'
import { IconButton } from '@/components/ui'
import { AppIcon } from '@/components/AppIcon'

const WEEKDAYS_MON = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
const WEEKDAYS_SUN = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']

export function MiniCalendar({
  anchor,
  onPick,
  firstDayOfWeek,
}: {
  anchor: Date
  onPick: (date: Date) => void
  firstDayOfWeek: 0 | 1
}) {
  const [month, setMonth] = useState(() => startOfMonth(anchor))
  const today = new Date()

  const days = useMemo(() => {
    const { start } = rangeFor('month', month, firstDayOfWeek)
    return eachDay(start, 42)
  }, [month, firstDayOfWeek])

  const weekdays = firstDayOfWeek === 1 ? WEEKDAYS_MON : WEEKDAYS_SUN

  return (
    <div className="px-1">
      <div className="mb-1.5 flex items-center justify-between pl-2">
        <span className="text-[14px] font-semibold text-ink">
          {format(month, 'LLLL yyyy', { locale })}
        </span>
        <div className="flex items-center">
          <IconButton
            label="Предыдущий месяц"
            className="h-7 w-7"
            onClick={() => setMonth(addMonths(month, -1))}
          >
            <AppIcon name="ChevronLeft" size={14} />
          </IconButton>
          <IconButton
            label="Следующий месяц"
            className="h-7 w-7"
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <AppIcon name="ChevronRight" size={14} />
          </IconButton>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {weekdays.map((day) => (
          <span key={day} className="py-1 text-center text-[10px] font-medium text-faint">
            {day}
          </span>
        ))}
        {days.map((day) => {
          const outside = !isSameMonth(day, month)
          const selected = isSameDay(day, anchor)
          const isToday = isSameDay(day, today)
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onPick(day)}
              className={cn(
                'mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[12px] transition-colors',
                outside && 'text-faint',
                !outside && !selected && 'text-ink hover:bg-[var(--sunken)]',
                isToday && !selected && 'font-bold text-[var(--lilac)]',
                selected && 'bg-[var(--grass)] font-semibold text-white',
              )}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
