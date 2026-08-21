import { cn } from '@/lib/utils'

export function KpmgLogo({
  collapsed = false,
  className,
}: {
  collapsed?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-center', className)}>
      <span className="text-[13.5px] font-semibold tracking-tight text-white">
        {collapsed ? 'I' : 'Index'}
      </span>
    </div>
  )
}
