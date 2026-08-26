'use client'

import { useEffect, useState } from 'react'
import { Info, X } from 'lucide-react'

import { useCrmStore } from '@/store/crm-store'
import { useSettingsStore } from '@/store/settings-store'

/**
 * Standing disclosure for the demonstration modes.
 *
 * Dismissible, but only this panel. The "Example data" chip beside the
 * timestamp is not, so closing this hides the explanation and never the
 * declaration — the source stays named on every page either way.
 *
 * It returns whenever the source, the AI mode or the variant changes, because
 * that is a different claim about what is on screen and it deserves to be read
 * once before being waved away again.
 */
export function DemoNotice() {
  const dataSource = useSettingsStore((s) => s.dataSource)
  const aiMode = useSettingsStore((s) => s.aiMode)
  const variant = useCrmStore((s) => s.feedbackVariant)

  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(false)
  }, [dataSource, aiMode, variant])

  if (dismissed) return null

  return (
    <aside
      aria-label="Demonstration data notice"
      className="fixed bottom-4 right-4 z-40 hidden max-w-[248px] rounded-xl border border-amber-200 bg-amber-50/95 py-2.5 pl-3 pr-2.5 shadow-card backdrop-blur-sm lg:block"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
            <Info className="size-3" strokeWidth={2.4} />
            Demonstration data
          </p>
          <p className="mt-1 text-[11px] leading-snug text-amber-800">
            {dataSource === 'client' ? 'Connected org feed' : 'Example book'}
            {' · '}
            {aiMode === 'live' ? 'live reasoning' : 'mock reasoning'}
            {variant > 0 ? ` · variant ${variant}` : ''}. Simulated throughout —
            no real customer is represented.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss the demonstration data notice"
          className="-mr-0.5 -mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-amber-700/70 transition-colors hover:bg-amber-100 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600/40"
        >
          <X className="size-3.5" strokeWidth={2.4} />
        </button>
      </div>
    </aside>
  )
}
