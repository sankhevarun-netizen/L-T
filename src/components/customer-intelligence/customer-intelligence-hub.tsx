'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Gauge, Layers, UserSearch, UsersRound, type LucideIcon } from 'lucide-react'

import { isOpen } from '@/lib/selectors/overview'
import { selectNpsSummary } from '@/lib/selectors/feedback'
import { useCrmStore } from '@/store/crm-store'
import { formatNumber } from '@/lib/format'

/**
 * Customer Intelligence hub.
 *
 * Four screens answer "who is this customer" rather than "what happened to
 * them", and they live in three different places in the rail. This is the one
 * page that names them together; each tile opens its own screen.
 *
 * Modelled on ArchitectureTiles and the CSAT capability grid rather than given
 * a third look of its own — a hub that does not resemble the app's other hubs
 * reads as a different product.
 */

interface Tile {
  name: string
  href: string
  icon: LucideIcon
  blurb: string
  /** The live figure on the footer row, and what it counts. */
  stat: string
  statLabel: string
  /** Secondary chip beside it. */
  chip: string
}

export function CustomerIntelligenceHub() {
  /*
   * Subscribed narrowly, and every figure below is one pass or an array length.
   *
   * A hub must not pay a page's compute. `usePersonaMap` would run sixteen
   * rules against six personas for every open lead to produce a single count,
   * and `useFeedbackData` computes themes, clusters and every trend to produce
   * two. Neither is called here; see the comments on those tiles.
   */
  const leads = useCrmStore((s) => s.leads)
  const surveyResponses = useCrmStore((s) => s.surveyResponses)
  const engagements = useCrmStore((s) => s.engagements)
  const siteVisits = useCrmStore((s) => s.siteVisits)
  const bookings = useCrmStore((s) => s.bookings)
  const payments = useCrmStore((s) => s.payments)
  const serviceTickets = useCrmStore((s) => s.serviceTickets)

  const tiles = useMemo<Tile[]>(() => {
    let hot = 0
    let open = 0
    for (const lead of leads) {
      if (lead.intent === 'high') hot += 1
      if (isOpen(lead)) open += 1
    }

    // Exactly what the Customer 360 tab consolidates, so the figure and the
    // screen it opens cannot disagree.
    const interactions =
      engagements.length +
      siteVisits.length +
      bookings.length +
      payments.length +
      serviceTickets.length

    const nps = selectNpsSummary(surveyResponses)

    return [
      {
        name: 'Lead Quality & Conversion Engine',
        href: '/leads',
        icon: UsersRound,
        blurb:
          'Every lead, scored and audited against the interaction record behind it.',
        stat: formatNumber(leads.length),
        statLabel: 'leads in the book',
        chip: `${formatNumber(hot)} high intent`,
      },
      {
        name: 'Customer Journey Orchestration Copilot',
        href: '/customers',
        icon: UserSearch,
        blurb:
          'One customer at a time — journey, interactions and the next move, in one view.',
        stat: formatNumber(interactions),
        statLabel: 'interactions consolidated',
        chip: 'five record types',
      },
      {
        name: 'Dynamic Persona & Property-fit Engine',
        href: '/persona-mapping',
        icon: Layers,
        blurb:
          'Each open lead scored against six buyer personas, with the signals that decided it.',
        /*
         * Not `usePersonaMap()`. That maps `leads.filter(isOpen)` and every
         * lead lands in some bucket, so the open count IS the mapped count —
         * the same number, without the rule pass.
         */
        stat: formatNumber(open),
        statLabel: 'open leads scored',
        chip: 'six personas',
      },
      {
        name: 'CSAT & NPS Intelligence',
        href: '/csat-nps',
        icon: Gauge,
        blurb:
          'From descriptive scores to governed feedback intelligence, across nine capabilities.',
        // One pass over the responses for both figures, rather than the full
        // feedback selector suite.
        stat: nps.nps > 0 ? `+${nps.nps}` : `${nps.nps}`,
        statLabel: 'net promoter score',
        chip: `${formatNumber(nps.responses)} responses`,
      },
    ]
  }, [leads, surveyResponses, engagements, siteVisits, bookings, payments, serviceTickets])

  return (
    <div className="animate-fade-in grid gap-3 sm:grid-cols-2">
      {tiles.map((tile) => {
        const Icon = tile.icon
        return (
          <Link
            key={tile.href}
            href={tile.href}
            className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <div className="flex items-start gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-kpmg-blue/10">
                <Icon className="size-4 text-kpmg-blue" strokeWidth={2.1} />
              </span>
              <h3 className="mt-1 text-[14px] font-bold leading-snug tracking-[-0.01em] text-slate-900">
                {tile.name}
              </h3>
            </div>

            <p className="mt-2.5 flex-1 text-[11.5px] leading-relaxed text-slate-500">
              {tile.blurb}
            </p>

            <div className="mt-3 flex items-end justify-between gap-3 border-t border-slate-100 pt-2.5">
              <div className="min-w-0">
                <p className="nums text-[22px] font-bold leading-tight text-kpmg-blue">
                  {tile.stat}
                </p>
                <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {tile.statLabel}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-600">
                {tile.chip}
              </span>
            </div>

            <span className="mt-2.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-kpmg-blue">
              Open
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        )
      })}
    </div>
  )
}
