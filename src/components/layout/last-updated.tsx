'use client'

import { useEffect, useState } from 'react'

import { formatDate } from '@/lib/format'

/**
 * Rendered after mount so the server and client never disagree on "today"
 * (a date computed during SSR would hydrate mismatched across a midnight
 * boundary or a differing timezone).
 */
export function LastUpdated() {
  const [stamp, setStamp] = useState<string | null>(null)

  useEffect(() => {
    setStamp(`${formatDate(new Date())}, 10:30 AM`)
  }, [])

  return (
    <p className="h-4 text-right text-xs text-slate-400">
      {stamp ? `Last updated: ${stamp}` : null}
    </p>
  )
}
