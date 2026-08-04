import { useState } from 'react'
import type { FigmaUser } from '@/types'
import { Avatar, Button } from '@/components/ui'
import { AppIcon } from '@/components/AppIcon'
import { FigmaSidebar } from './FigmaSidebar'
import { FigmaOverview } from './FigmaOverview'
import { FigmaFileDetail } from './FigmaFileDetail'

export function FigmaWorkspace({ user, onDisconnect }: { user: FigmaUser; onDisconnect: () => void }) {
  const [selectedFile, setSelectedFile] = useState<{ key: string; name: string } | null>(null)
  const [refreshSignal, setRefreshSignal] = useState(0)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="drag-region flex h-9 shrink-0 items-center justify-end gap-2 pr-3">
        <span className="no-drag flex items-center gap-2 text-[12px] text-muted">
          <Avatar src={user.img_url} name={user.handle} size={20} />
          {user.handle}
        </span>
        <Button variant="ghost" size="sm" className="no-drag" onClick={onDisconnect}>
          <AppIcon name="LogOut" size={14} />
          Отключить
        </Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <FigmaSidebar
          selectedFileKey={selectedFile?.key ?? null}
          onSelectFile={(key, name) => setSelectedFile({ key, name })}
          onSelectOverview={() => setSelectedFile(null)}
        />
        <div className="scroll-thin min-h-0 min-w-0 flex-1 overflow-y-auto p-4">
          {selectedFile ? (
            <FigmaFileDetail
              key={selectedFile.key}
              fileKey={selectedFile.key}
              fallbackName={selectedFile.name}
              onDataChanged={() => setRefreshSignal((v) => v + 1)}
            />
          ) : (
            <FigmaOverview onOpenFile={(key, name) => setSelectedFile({ key, name })} refreshSignal={refreshSignal} />
          )}
        </div>
      </div>
    </div>
  )
}
