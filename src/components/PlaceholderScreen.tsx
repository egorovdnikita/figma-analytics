import type { LucideIcon } from 'lucide-react'

export function PlaceholderScreen({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
      <Icon size={32} />
      <p className="text-[14px]">Раздел «{title}» скоро появится</p>
    </div>
  )
}
