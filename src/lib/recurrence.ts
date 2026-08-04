/** Пресеты повторения. Полный RRULE-редактор в MVP не делаем. */
export interface RecurrencePreset {
  value: string
  label: string
  rule: string | null
}

export const RECURRENCE_PRESETS: RecurrencePreset[] = [
  { value: 'none', label: 'Не повторяется', rule: null },
  { value: 'daily', label: 'Ежедневно', rule: 'RRULE:FREQ=DAILY' },
  { value: 'weekdays', label: 'По будням (пн—пт)', rule: 'RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
  { value: 'weekly', label: 'Еженедельно', rule: 'RRULE:FREQ=WEEKLY' },
  { value: 'biweekly', label: 'Раз в две недели', rule: 'RRULE:FREQ=WEEKLY;INTERVAL=2' },
  { value: 'monthly', label: 'Ежемесячно', rule: 'RRULE:FREQ=MONTHLY' },
  { value: 'yearly', label: 'Ежегодно', rule: 'RRULE:FREQ=YEARLY' },
]

export function presetFromRules(rules?: string[]): string {
  if (!rules?.length) return 'none'
  const rule = rules.find((r) => r.startsWith('RRULE'))
  if (!rule) return 'none'
  const match = RECURRENCE_PRESETS.find((preset) => preset.rule === rule)
  return match ? match.value : 'custom'
}

export function describeRecurrence(rules?: string[]): string | null {
  if (!rules?.length) return null
  const preset = presetFromRules(rules)
  if (preset === 'custom') return 'Повторяющееся событие'
  return RECURRENCE_PRESETS.find((p) => p.value === preset)?.label ?? null
}

export function rulesFromPreset(preset: string, current?: string[]): string[] | undefined {
  if (preset === 'custom') return current
  const found = RECURRENCE_PRESETS.find((p) => p.value === preset)
  return found?.rule ? [found.rule] : undefined
}
