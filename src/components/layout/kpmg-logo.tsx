import { cn } from '@/lib/utils'

/**
 * The sidebar wordmark: the product name, then the firm's mark beside it.
 *
 * A plain <img> rather than next/image — the asset is a fixed-size local PNG
 * that never needs resizing or lazy loading, and next/image is not otherwise
 * used in this build. Explicit width and height are set so the rail does not
 * reflow while it loads.
 *
 * The mark is white on transparency, which is why it only works against the
 * dark rail. Its intrinsic aspect is 2.5:1, measured from the asset's own ink
 * bounds, so the width below is derived rather than guessed.
 */

/*
 * Rendered height of the mark, and the width its aspect gives.
 *
 * 22 rather than 18: the four squares are hairline outlines in the artwork, so
 * they thin out fast as the mark shrinks. The asset itself is 800x320 — around
 * fifteen times what is drawn here — so the detail is in the file; this is only
 * how much of it is shown.
 */
const MARK_H = 22
const MARK_W = Math.round(MARK_H * 2.5)

export function KpmgLogo({
  collapsed = false,
  className,
}: {
  collapsed?: boolean
  className?: string
}) {
  const mark = (
    <img
      src="/kpmg-logo.png"
      alt="KPMG"
      width={MARK_W}
      height={MARK_H}
      style={{ width: MARK_W, height: MARK_H }}
      className="shrink-0 select-none"
    />
  )

  /*
   * Collapsed the rail is 72px, which will not carry a label and a mark. The
   * mark alone is the better survivor — it is the thing that identifies the
   * product at a glance, where a lone "I" identifies nothing.
   */
  if (collapsed) {
    return <div className={cn('flex items-center', className)}>{mark}</div>
  }

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="text-[13.5px] font-semibold tracking-tight text-white">
        Index
      </span>
      {/* Keeps the product name and the firm's mark from reading as one lockup. */}
      <span className="h-4 w-px shrink-0 bg-white/20" aria-hidden />
      {mark}
    </div>
  )
}
