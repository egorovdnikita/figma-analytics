import { contextBridge, ipcRenderer } from 'electron'

type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } }

const invoke = <T>(channel: string, ...args: unknown[]): Promise<Envelope<T>> =>
  ipcRenderer.invoke(channel, ...args)

const api = {
  auth: {
    state: () => invoke<any>('auth:state'),
    signIn: () => invoke<any>('auth:signIn'),
    signOut: () => invoke<void>('auth:signOut'),
    revoke: () => invoke<void>('auth:revoke'),
    profile: () => invoke<any>('auth:profile'),
  },
  credentials: {
    get: () => invoke<{ clientId: string; hasSecret: boolean }>('credentials:get'),
    set: (creds: { clientId: string; clientSecret: string }) =>
      invoke<boolean>('credentials:set', creds),
    clear: () => invoke<boolean>('credentials:clear'),
  },
  calendar: {
    list: () => invoke<any[]>('calendar:list'),
    setSelected: (id: string, selected: boolean) =>
      invoke<any>('calendar:setSelected', id, selected),
    colors: () => invoke<any>('calendar:colors'),
    googleSettings: () => invoke<Record<string, string>>('calendar:googleSettings'),
  },
  events: {
    list: (args: { calendarId: string; timeMin: string; timeMax: string; query?: string }) =>
      invoke<any[]>('events:list', args),
    create: (calendarId: string, event: unknown) => invoke<any>('events:create', calendarId, event),
    update: (calendarId: string, eventId: string, patch: unknown) =>
      invoke<any>('events:update', calendarId, eventId, patch),
    remove: (calendarId: string, eventId: string) =>
      invoke<{ ok: boolean }>('events:delete', calendarId, eventId),
    respond: (calendarId: string, eventId: string, response: string) =>
      invoke<any>('events:respond', calendarId, eventId, response),
  },
  settings: {
    get: () => invoke<any>('settings:get'),
    set: (patch: Record<string, unknown>) => invoke<any>('settings:set', patch),
  },
  app: {
    info: () => invoke<any>('app:info'),
    openExternal: (url: string) => invoke<boolean>('app:openExternal', url),
  },
}

contextBridge.exposeInMainWorld('boxui', api)

export type BoxUiApi = typeof api
