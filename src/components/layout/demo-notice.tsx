'use client'

import { Info } from 'lucide-react'

import { useCrmStore } from '@/store/crm-store'
import { useSettingsStore } from '@/store/settings-store'

/**
 * Standing disclosure.
 *
 * The data source and AI mode controls both change what the screens show, and
 * neither is reading a real customer. This says so permanently and out of the
 * way, so a viewer who switches modes is never left inferring what they are
 * looking at. Static by design: it does not animate, dismiss or move.
 */
export function DemoNotice() {
  const dataSource = useSettingsStore((s) => s.dataSource)
  const aiMode = useSettingsStore((s) => s.aiMode)
  const variant = useCrmStore((s) => s.feedbackVariant)

  return (
    <aside
      aria-label="Demonstration data notice"
      className="pointer-events-none fixed bottom-4 right-4 z-40 hidden max-w-[228px] rounded-xl border border-amber-200 bg-amber-50/95 px-3 py-2.5 shadow-card backdrop-blur-sm lg:block"
    >
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
        <Info className="size-3" strokeWidth={2.4} />
        Demonstration data
      </p>
      <p className="mt-1 text-[11px] leading-snug text-amber-800">
        {dataSource === 'client' ? 'Connected org feed' : 'Example book'}
        {' · '}
        {aiMode === 'live' ? 'live reasoning' : 'mock reasoning'}
        {variant > 0 ? ` · variant ${variant}` : ''}. Simulated throughout — no
        real customer is represented.
      </p>
    </aside>
  )
}
