import { useCallback, useEffect, useState } from 'react'
import { ipc, IpcError } from '@/lib/ipc'
import type { FigmaUser } from '@/types'
import { Spinner } from '@/components/ui'
import { FigmaConnect } from './FigmaConnect'
import { FigmaWorkspace } from './FigmaWorkspace'

type Status = 'checking' | 'disconnected' | 'connected'

export function FigmaScreen() {
  const [status, setStatus] = useState<Status>('checking')
  const [user, setUser] = useState<FigmaUser | null>(null)

  const check = useCallback(async () => {
    try {
      const result = await ipc.figmaStatus()
      setUser(result.user)
      setStatus(result.connected ? 'connected' : 'disconnected')
    } catch {
      setStatus('disconnected')
    }
  }, [])

  useEffect(() => {
    void check()
  }, [check])

  const disconnect = useCallback(async () => {
    try {
      await ipc.figmaClearToken()
    } catch (error) {
      if (!(error instanceof IpcError)) throw error
    }
    setUser(null)
    setStatus('disconnected')
  }, [])

  if (status === 'checking') {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  if (status === 'disconnected') {
    return <FigmaConnect onConnected={(nextUser) => { setUser(nextUser); setStatus('connected') }} />
  }

  return <FigmaWorkspace user={user} onDisconnect={disconnect} />
}
