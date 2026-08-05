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
  figma: {
    status: () => invoke<{ connected: boolean; user: any | null }>('figma:status'),
    setToken: (token: string) => invoke<any>('figma:setToken', token),
    clearToken: () => invoke<boolean>('figma:clearToken'),
    teamsList: () => invoke<{ id: string; label: string }[]>('figma:teams:list'),
    teamsAdd: (id: string, label: string) =>
      invoke<{ id: string; label: string }[]>('figma:teams:add', id, label),
    teamsRemove: (id: string) => invoke<{ id: string; label: string }[]>('figma:teams:remove', id),
    projects: (teamId: string) => invoke<any[]>('figma:projects', teamId),
    files: (projectId: string) => invoke<any[]>('figma:files', projectId),
    file: (fileKey: string) => invoke<any>('figma:file', fileKey),
    versions: (fileKey: string, offset: number, limit: number) =>
      invoke<any>('figma:versions', fileKey, offset, limit),
    comments: (fileKey: string, offset: number, limit: number) =>
      invoke<any>('figma:comments', fileKey, offset, limit),
    overview: () => invoke<any[]>('figma:overview'),
    teamLibrary: (teamId: string) => invoke<any>('figma:teamLibrary', teamId),
    events: () => invoke<any[]>('figma:events'),
    fileIndex: () => invoke<any[]>('figma:fileIndex'),
    peopleDirectory: () => invoke<any[]>('figma:peopleDirectory'),
    prefs: () => invoke<any>('figma:prefs'),
    setPrefs: (patch: Record<string, unknown>) => invoke<any>('figma:setPrefs', patch),
    cacheStats: () => invoke<any>('figma:cacheStats'),
    clearCache: () => invoke<boolean>('figma:clearCache'),
    exportCsv: () => invoke<{ saved: boolean; path: string | null }>('figma:exportCsv'),
    hiddenUsers: () => invoke<string[]>('figma:hiddenUsers'),
    setHiddenUsers: (handles: string[]) => invoke<string[]>('figma:setHiddenUsers', handles),
    sync: () => invoke<any>('figma:sync'),
    onSyncProgress: (listener: (progress: any) => void) => {
      const handler = (_event: unknown, progress: any) => listener(progress)
      ipcRenderer.on('figma:syncProgress', handler)
      return () => ipcRenderer.off('figma:syncProgress', handler)
    },
  },
}

contextBridge.exposeInMainWorld('boxui', api)

export type BoxUiApi = typeof api
