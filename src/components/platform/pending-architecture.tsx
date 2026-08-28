import { LayoutTemplate } from 'lucide-react'

/**
 * A tile that is reserved but not yet filled.
 *
 * Deliberately empty rather than mocked up. A skeleton or a dummy diagram
 * outline would be the one thing on this platform depicting an architecture
 * nobody authored — and it would be indistinguishable from real content at a
 * glance, which is exactly the failure mode worth avoiding.
 */
export function PendingArchitecture() {
  return (
    <div className="flex min-h-[46vh] items-center justify-center px-4">
      <div className="w-full max-w-[520px] rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-card">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
          <LayoutTemplate className="size-6" strokeWidth={1.8} />
        </span>

        <h2 className="mt-4 text-[18px] font-bold tracking-[-0.01em] text-slate-900">
          Architecture not added yet
        </h2>
        <p className="mx-auto mt-2 max-w-[44ch] text-[13px] leading-relaxed text-slate-500">
          This tile is reserved for the KPMG DICE architecture for customer
          lifecycle management. Nothing is drawn here yet because the diagram has
          not been supplied — a placeholder diagram would be indistinguishable
          from the real one.
        </p>
      </div>
    </div>
  )
}
