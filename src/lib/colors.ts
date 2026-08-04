import type { Calendar, CalendarEvent } from '@/types'

/** Палитра Google Calendar (colorId события). */
export const EVENT_COLORS: Record<string, { hex: string; label: string }> = {
  '1': { hex: '#7986cb', label: 'Лаванда' },
  '2': { hex: '#33b679', label: 'Шалфей' },
  '3': { hex: '#8e24aa', label: 'Виноград' },
  '4': { hex: '#e67c73', label: 'Фламинго' },
  '5': { hex: '#f6bf26', label: 'Банан' },
  '6': { hex: '#f4511e', label: 'Мандарин' },
  '7': { hex: '#039be5', label: 'Павлин' },
  '8': { hex: '#616161', label: 'Графит' },
  '9': { hex: '#3f51b5', label: 'Черника' },
  '10': { hex: '#0b8043', label: 'Базилик' },
  '11': { hex: '#d50000', label: 'Томат' },
}

export function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean
  const num = Number.parseInt(full, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

export function tint(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** Относительная яркость — чтобы выбрать читаемый цвет текста. */
export function isLight(hex: string) {
  const { r, g, b } = hexToRgb(hex)
  return (r * 299 + g * 587 + b * 114) / 1000 > 165
}

/** Смешивает цвет с белым/чёрным, чтобы текст читался на подложке. */
export function readableInk(hex: string, dark: boolean) {
  const { r, g, b } = hexToRgb(hex)
  if (dark) {
    const mix = (c: number) => Math.round(c + (255 - c) * 0.45)
    return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
  }
  const mix = (c: number) => Math.round(c * 0.62)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

export function eventColor(event: CalendarEvent, calendars: Calendar[]) {
  if (event.colorId && EVENT_COLORS[event.colorId]) return EVENT_COLORS[event.colorId].hex
  const calendar = calendars.find((c) => c.id === event.calendarId)
  return calendar?.backgroundColor ?? '#7cc49b'
}
