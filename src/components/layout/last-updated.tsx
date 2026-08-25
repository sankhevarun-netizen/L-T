'use client'

import { useEffect, useState } from 'react'

import { Database } from 'lucide-react'

import { formatDate } from '@/lib/format'
import { useSettingsStore } from '@/store/settings-store'

/**
 * Rendered after mount so the server and client never disagree on "today"
 * (a date computed during SSR would hydrate mismatched across a midnight
 * boundary or a differing timezone).
 */
export function LastUpdated() {
  const [stamp, setStamp] = useState<string | null>(null)
  const dataSource = useSettingsStore((s) => s.dataSource)

  useEffect(() => {
    setStamp(`${formatDate(new Date())}, 10:30 AM`)
  }, [])

  return (
    <div className="flex h-4 items-center justify-end gap-3">
      {/*
        Always visible, never behind a menu. A client should be able to see
        which data they are looking at without the presenter telling them.
      */}
      <span
        title={
          dataSource === 'example'
            ? 'Synthetic demonstration data. No client records are connected.'
            : 'Connected to client records.'
        }
        className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700"
      >
        <Database className="size-3" strokeWidth={2.3} />
        {dataSource === 'example' ? 'Example data' : 'Client data'}
      </span>

      <p className="text-right text-xs text-slate-400">
        {stamp ? `Last updated: ${stamp}` : null}
      </p>
    </div>
  )
}
