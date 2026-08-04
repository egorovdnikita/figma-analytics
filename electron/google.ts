import { getAccessToken } from './auth'

const BASE = 'https://www.googleapis.com/calendar/v3'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function api<T>(pathname: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = await getAccessToken()
  const res = await fetch(`${BASE}${pathname}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (res.status === 401 && retry) {
    await getAccessToken(true)
    return api<T>(pathname, init, false)
  }
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      message = body.error?.message ?? message
    } catch {
      /* тело не JSON */
    }
    throw new ApiError(res.status, message)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  return search.toString()
}

/* ---------- календари ---------- */

export interface RawCalendar {
  id: string
  summary: string
  summaryOverride?: string
  description?: string
  location?: string
  timeZone?: string
  colorId?: string
  backgroundColor?: string
  foregroundColor?: string
  selected?: boolean
  primary?: boolean
  accessRole: string
  defaultReminders?: { method: string; minutes: number }[]
}

export async function listCalendars() {
  const items: RawCalendar[] = []
  let pageToken: string | undefined
  do {
    const page = await api<{ items?: RawCalendar[]; nextPageToken?: string }>(
      `/users/me/calendarList?${qs({ maxResults: 250, showHidden: true, pageToken })}`,
    )
    items.push(...(page.items ?? []))
    pageToken = page.nextPageToken
  } while (pageToken)
  return items
}

export async function updateCalendarSelected(calendarId: string, selected: boolean) {
  return api<RawCalendar>(`/users/me/calendarList/${encodeURIComponent(calendarId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ selected }),
  })
}

/* ---------- события ---------- */

export interface RawEvent {
  id: string
  status?: string
  htmlLink?: string
  summary?: string
  description?: string
  location?: string
  colorId?: string
  created?: string
  updated?: string
  start: { date?: string; dateTime?: string; timeZone?: string }
  end: { date?: string; dateTime?: string; timeZone?: string }
  recurrence?: string[]
  recurringEventId?: string
  transparency?: string
  visibility?: string
  hangoutLink?: string
  conferenceData?: unknown
  organizer?: { email?: string; displayName?: string; self?: boolean }
  creator?: { email?: string; displayName?: string; self?: boolean }
  attendees?: {
    email: string
    displayName?: string
    organizer?: boolean
    self?: boolean
    optional?: boolean
    responseStatus?: string
  }[]
  reminders?: { useDefault: boolean; overrides?: { method: string; minutes: number }[] }
  eventType?: string
}

export interface ListEventsArgs {
  calendarId: string
  timeMin: string
  timeMax: string
  query?: string
}

export async function listEvents({ calendarId, timeMin, timeMax, query }: ListEventsArgs) {
  const items: RawEvent[] = []
  let pageToken: string | undefined
  do {
    const page = await api<{ items?: RawEvent[]; nextPageToken?: string }>(
      `/calendars/${encodeURIComponent(calendarId)}/events?${qs({
        timeMin,
        timeMax,
        q: query,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 2500,
        showDeleted: false,
        pageToken,
      })}`,
    )
    items.push(...(page.items ?? []))
    pageToken = page.nextPageToken
  } while (pageToken)
  return items.map((event) => ({ ...event, calendarId }))
}

export async function createEvent(calendarId: string, event: Partial<RawEvent>) {
  const created = await api<RawEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events?${qs({ sendUpdates: 'all' })}`,
    { method: 'POST', body: JSON.stringify(event) },
  )
  return { ...created, calendarId }
}

export async function updateEvent(calendarId: string, eventId: string, patch: Partial<RawEvent>) {
  const updated = await api<RawEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?${qs({
      sendUpdates: 'all',
    })}`,
    { method: 'PATCH', body: JSON.stringify(patch) },
  )
  return { ...updated, calendarId }
}

export async function deleteEvent(calendarId: string, eventId: string) {
  await api<void>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?${qs({
      sendUpdates: 'all',
    })}`,
    { method: 'DELETE' },
  )
  return { ok: true }
}

export async function respondToEvent(
  calendarId: string,
  eventId: string,
  response: 'accepted' | 'declined' | 'tentative',
) {
  const event = await api<RawEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
  )
  const attendees = (event.attendees ?? []).map((a) =>
    a.self ? { ...a, responseStatus: response } : a,
  )
  return updateEvent(calendarId, eventId, { attendees })
}

/* ---------- справочники ---------- */

export async function getColors() {
  return api<{
    calendar: Record<string, { background: string; foreground: string }>
    event: Record<string, { background: string; foreground: string }>
  }>('/colors')
}

export async function getUserSettings() {
  const page = await api<{ items?: { id: string; value: string }[] }>(
    `/users/me/settings?${qs({ maxResults: 250 })}`,
  )
  const map: Record<string, string> = {}
  for (const item of page.items ?? []) map[item.id] = item.value
  return map
}
