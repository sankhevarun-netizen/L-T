'use client'

import { ArrowDownRight, ArrowUpRight, Gauge, ListChecks, ShieldAlert } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatTile } from '@/components/shared/stat-tile'
import { IllustrativeBadge } from './guardrails'
import { useFeedbackData } from '@/lib/selectors/use-feedback-data'
import { formatNumber } from '@/lib/format'
import type { Intervention } from '@/types'
import { cn } from '@/lib/utils'

/**
 * Voice-of-Customer Control Tower.
 *
 * The executive close: what is moving satisfaction, what is at risk, and what
 * is being done about it. Impact and effort are configured inputs rather than
 * model outputs — presenting a prioritisation as if it were predicted would
 * overclaim exactly where the guardrails say not to.
 */

const STATUS_TONE: Record<Intervention['status'], string> = {
  backlog: 'bg-slate-100 text-slate-600',
  planned: 'bg-sky-50 text-sky-700',
  'in-flight': 'bg-kpmg-blue/10 text-kpmg-blue',
  done: 'bg-emerald-50 text-emerald-700',
}

function DriverRow({
  label,
  aspect,
  mentions,
  delta,
}: {
  label: string
  aspect: string
  mentions: number
  delta: number
}) {
  const positive = delta > 0
  return (
    <li className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0">
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-lg',
          positive ? 'bg-kpmg-teal/10' : 'bg-red-50',
        )}
      >
        {positive ? (
          <ArrowUpRight className="size-3.5 text-kpmg-teal" strokeWidth={2.4} />
        ) : (
          <ArrowDownRight className="size-3.5 text-red-600" strokeWidth={2.4} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-semibold text-slate-900">
          {label}
        </p>
        <p className="truncate text-[11px] text-slate-500">
          {aspect} · {formatNumber(mentions)} mentions
        </p>
      </div>
      <span
        className={cn(
          'nums shrink-0 rounded-md px-1.5 py-0.5 text-[12px] font-bold',
          positive
            ? 'bg-kpmg-teal/10 text-kpmg-teal'
            : 'bg-red-50 text-red-700',
        )}
      >
        {positive ? '+' : ''}
        {delta}
      </span>
    </li>
  )
}

export function ControlTower() {
  const { drivers, interventions, recovery, nps, npsTrend, clusters } =
    useFeedbackData()

  const previous = npsTrend.filter((p) => p.responses > 0).slice(-2)[0]
  const npsDelta = previous ? nps.nps - previous.nps : 0

  /* Impact-effort matrix: high impact / low effort is the top-left quadrant. */
  const maxImpact = 10
  const maxEffort = 10

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Net Promoter Score"
          value={`${nps.nps > 0 ? '+' : ''}${nps.nps}`}
          sub={`${npsDelta >= 0 ? '+' : ''}${npsDelta} vs previous month`}
          icon={Gauge}
        />
        <StatTile
          label="Detractors"
          value={`${nps.detractorPct}%`}
          sub={`${formatNumber(nps.detractors)} responses`}
          icon={ShieldAlert}
          danger
        />
        <StatTile
          label="Recovery closure"
          value={`${recovery.closureRatePct}%`}
          sub={`${formatNumber(recovery.breaching)} breaching SLA`}
          icon={ListChecks}
          accent="text-kpmg-teal"
          accentBg="bg-kpmg-teal/10"
        />
        <StatTile
          label="Interventions"
          value={formatNumber(interventions.length)}
          sub={`${interventions.filter((i) => i.status === 'in-flight').length} in flight`}
          icon={ListChecks}
          accent="text-kpmg-violet"
          accentBg="bg-kpmg-violet/10"
        />
      </div>

      {/* Drivers, both directions */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>What is lifting satisfaction</CardTitle>
            <IllustrativeBadge />
          </CardHeader>
          <CardContent className="p-0">
            {drivers.strengths.length ? (
              <ul>
                {drivers.strengths.map((d) => (
                  <DriverRow
                    key={d.label}
                    label={d.label}
                    aspect={d.aspect}
                    mentions={d.mentions}
                    delta={d.npsDelta}
                  />
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-[12px] text-slate-400">
                No theme is lifting NPS above the book mean.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>What is dragging it down</CardTitle>
            <IllustrativeBadge />
          </CardHeader>
          <CardContent className="p-0">
            <ul>
              {drivers.drags.map((d) => (
                <DriverRow
                  key={d.label}
                  label={d.label}
                  aspect={d.aspect}
                  mentions={d.mentions}
                  delta={d.npsDelta}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Impact-effort matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Intervention priority — impact against effort</CardTitle>
          <span className="text-[10.5px] font-medium text-slate-400">
            Configured inputs, not predictions
          </span>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="relative h-[260px] w-full rounded-lg border border-slate-200 bg-slate-50/50">
            {/* Quadrant guides */}
            <div className="absolute inset-y-0 left-1/2 w-px bg-slate-200" />
            <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
            <span className="absolute left-2 top-2 text-[10px] font-semibold uppercase tracking-wider text-kpmg-teal">
              Do first
            </span>
            <span className="absolute right-2 top-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Plan
            </span>
            <span className="absolute bottom-2 left-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Quick wins
            </span>
            <span className="absolute bottom-2 right-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Deprioritise
            </span>

            {interventions.map((intervention) => (
              <div
                key={intervention.id}
                title={`${intervention.title} — impact ${intervention.impact}, effort ${intervention.effort}`}
                className="absolute flex -translate-x-1/2 translate-y-1/2 items-center gap-1"
                style={{
                  left: `${(intervention.effort / maxEffort) * 88 + 6}%`,
                  bottom: `${(intervention.impact / maxImpact) * 82 + 8}%`,
                }}
              >
                <span className="size-2.5 shrink-0 rounded-full bg-kpmg-blue ring-2 ring-white" />
                <span className="whitespace-nowrap rounded bg-white/90 px-1 text-[10px] font-medium text-slate-600">
                  {intervention.owner}
                </span>
              </div>
            ))}

            <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 translate-y-full pt-1 text-[10px] text-slate-400">
              Effort →
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Intervention backlog */}
      <Card>
        <CardHeader>
          <CardTitle>Improvement backlog</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul>
            {interventions.map((intervention) => {
              const cluster = clusters.find(
                (c) => c.id === intervention.clusterId,
              )
              return (
                <li
                  key={intervention.id}
                  className="flex items-center gap-3 border-b border-slate-100 px-4 py-2.5 last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-slate-900">
                      {intervention.title}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {intervention.owner}
                      {cluster
                        ? ` · ${formatNumber(cluster.affectedResponses)} responses · ${cluster.npsDrag} NPS`
                        : ''}
                    </p>
                  </div>
                  <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                    <span className="nums rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                      I{intervention.impact}
                    </span>
                    <span className="nums rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">
                      E{intervention.effort}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider',
                      STATUS_TONE[intervention.status],
                    )}
                  >
                    {intervention.status}
                  </span>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
