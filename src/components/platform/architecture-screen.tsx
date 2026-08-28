import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CRM_ARCHITECTURE_NOTE, CrmArchitecture } from './crm-architecture'
import { ARCHITECTURES, architectureBySlug } from './architectures'
import { cn } from '@/lib/utils'

/**
 * One architecture, full width.
 *
 * The bar at the top is the same shape the CSAT use-case screens use — a way
 * back plus a segment per sibling — so moving between architectures does not
 * mean returning to the tile grid first. With one architecture registered the
 * segments are still worth rendering: they are how the next one arrives.
 */
export function ArchitectureScreen({ slug }: { slug: string }) {
  const architecture = architectureBySlug(slug)
  if (!architecture) return null

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-card">
        <Link
          href="/platform"
          className="mr-1 flex items-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          <ArrowLeft className="size-3.5" />
          How it Works
        </Link>

        {ARCHITECTURES.map((entry) => (
          <Link
            key={entry.slug}
            href={`/platform/${entry.slug}`}
            className={cn(
              'rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition-colors',
              entry.slug === slug
                ? 'bg-kpmg-navy text-white'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
            )}
          >
            {entry.shortName}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{architecture.name}</CardTitle>
          <p className="shrink-0 text-[11.5px] text-slate-400">
            Where this build sits inside the full target stack
          </p>
        </CardHeader>
        <CardContent>
          <CrmArchitecture />

          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-kpmg-teal/25 bg-kpmg-teal/[0.05] p-3.5">
            <Check
              className="mt-0.5 size-4 shrink-0 text-kpmg-teal"
              strokeWidth={2.4}
            />
            <p className="text-[12px] leading-relaxed text-slate-600">
              {CRM_ARCHITECTURE_NOTE}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
