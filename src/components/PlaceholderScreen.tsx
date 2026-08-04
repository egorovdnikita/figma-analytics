import { AppIcon, type IconName } from '@/components/AppIcon'

export function PlaceholderScreen({ icon, title }: { icon: IconName; title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
      <AppIcon name={icon} size={32} />
      <p className="text-[14px]">Раздел «{title}» скоро появится</p>
    </div>
  )
}
