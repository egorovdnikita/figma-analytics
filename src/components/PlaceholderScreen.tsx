import type { ReactNode } from 'react'

export function PlaceholderScreen({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
      {icon}
      <p className="text-[14px]">Раздел «{title}» скоро появится</p>
    </div>
  )
}
