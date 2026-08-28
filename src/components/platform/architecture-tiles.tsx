import Link from 'next/link'
import { ArrowRight, Layers3 } from 'lucide-react'

import { ARCHITECTURES } from './architectures'

/**
 * Reference architectures, as tiles.
 *
 * These used to render inline, six layers deep, pushing the rest of the page
 * below the fold and sharing width with an outcomes rail. Each one now gets a
 * tile here and the whole page to itself when opened.
 *
 * The figures on a tile are folded from that architecture's own data, so a
 * tile cannot claim coverage the diagram behind it does not show.
 */
export function ArchitectureTiles() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {ARCHITECTURES.map((architecture) => {
        const Icon = architecture.icon
        const { layers, built, total } = architecture.summary

        return (
          <Link
            key={architecture.slug}
            href={`/platform/${architecture.slug}`}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <div className="flex items-start gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-kpmg-blue/10">
                <Icon className="size-4 text-kpmg-blue" strokeWidth={2.1} />
              </span>
              <h3 className="mt-1 text-[14px] font-bold leading-snug tracking-[-0.01em] text-slate-900">
                {architecture.name}
              </h3>
            </div>

            <p className="mt-2.5 flex-1 text-[11.5px] leading-relaxed text-slate-500">
              {architecture.blurb}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2.5">
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                <Layers3 className="size-3.5 text-slate-400" strokeWidth={2.1} />
                <span className="nums">{layers}</span> layers
              </span>
              <span className="nums rounded-full bg-kpmg-teal/10 px-2 py-0.5 text-[10.5px] font-semibold text-kpmg-teal">
                {built} of {total} in this build
              </span>
              <span className="ml-auto flex items-center gap-1 text-[11.5px] font-semibold text-kpmg-blue">
                Open
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
