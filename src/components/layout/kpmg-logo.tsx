import { cn } from '@/lib/utils'

/**
 * KPMG-inspired wordmark: four skewed blocks above the letterforms, with the
 * product tag ("DICE") in a contrasting chip beside it.
 */
export function KpmgLogo({
  collapsed = false,
  className,
}: {
  collapsed?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="flex flex-col gap-[5px]">
        <div className="flex gap-[3px]" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-[7px] w-[11px] -skew-x-[18deg] rounded-[1px] bg-white/40"
            />
          ))}
        </div>
        {!collapsed && (
          <span className="text-[19px] font-extrabold leading-none tracking-[-0.02em] text-white">
            KPMG
          </span>
        )}
      </div>

      {!collapsed && (
        <span className="rounded-md bg-white px-[7px] py-[3px] text-[11px] font-extrabold leading-none tracking-[0.08em] text-kpmg-navy">
          DICE
        </span>
      )}
    </div>
  )
}
