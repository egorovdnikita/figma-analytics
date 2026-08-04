import { Moon, RefreshCw, Sun } from 'lucide-react'
import { format } from 'date-fns'
import { useApp } from '@/state/store'
import { Avatar, IconButton, Spinner } from '@/components/ui'

export function AppHeader() {
  const { loading, refresh, resolvedTheme, updateSettings, profile, setScreen, syncedAt } = useApp()

  return (
    <header className="drag-region flex h-14 shrink-0 items-center justify-end gap-2 border-b border-line bg-surface px-4">
      <span className="no-drag hidden text-[12px] text-faint md:inline">
        {loading ? 'синхронизация…' : syncedAt ? `обновлено в ${format(syncedAt, 'HH:mm')}` : ''}
      </span>
      <div className="no-drag flex items-center gap-0.5">
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
          aria-label="Профиль"
          className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-85"
        >
          <Avatar src={profile?.picture} name={profile?.name} size={32} />
        </button>
      </div>
    </header>
  )
}
