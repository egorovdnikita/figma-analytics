import { Moon, RefreshCw, Sun } from 'lucide-react'
import { format } from 'date-fns'
import { useApp } from '@/state/store'
import { Avatar, IconButton, Spinner } from '@/components/ui'

export function AppHeader() {
  const { loading, refresh, resolvedTheme, updateSettings, profile, setScreen, syncedAt } = useApp()

  return (
    <header className="drag-region flex h-11 shrink-0 items-center justify-end gap-1 px-4 pt-3">
      <div className="no-drag flex items-center gap-1">
        <span className="mr-1 hidden text-[12px] text-faint md:inline">
          {loading ? 'синхронизация…' : syncedAt ? `обновлено в ${format(syncedAt, 'HH:mm')}` : ''}
        </span>
        <IconButton label="Обновить" onClick={() => void refresh()}>
          {loading ? <Spinner /> : <RefreshCw size={17} />}
        </IconButton>
        <IconButton
          label={resolvedTheme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          onClick={() =>
            void updateSettings({ theme: resolvedTheme === 'dark' ? 'light' : 'dark' })
          }
        >
          {resolvedTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </IconButton>
        <button
          type="button"
          onClick={() => setScreen('profile')}
          className="ml-1 rounded-full transition-opacity hover:opacity-85"
          aria-label="Профиль"
        >
          <Avatar src={profile?.picture} name={profile?.name} size={36} />
        </button>
      </div>
    </header>
  )
}
