'use client'

import { useState } from 'react'
import { Layers, Repeat, TrendingDown } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatTile } from '@/components/shared/stat-tile'
import {
  CorrelationNote,
  EvidenceList,
  IllustrativeBadge,
} from './guardrails'
import { useFeedbackData } from '@/lib/selectors/use-feedback-data'
import { formatNumber } from '@/lib/format'
import { STAGE_ORDER, TOUCHPOINT_LABEL, TOUCHPOINT_ORDER } from '@/types'
import type { JourneyStage, TouchpointId } from '@/types'
import { cn } from '@/lib/utils'

/**
 * Root Cause Intelligence Engine.
 *
 * Connects what customers said to where in the journey they said it. The
 * correlation column is the load-bearing caveat: it measures association with
 * detractor scores and nothing more, so the copy says "requires business
 * validation" everywhere it appears rather than implying a cause.
 */

const STAGE_LABEL: Record<JourneyStage, string> = {
  lead: 'Lead',
  engaged: 'Engaged',
  qualified: 'Qualified',
  'site-visit': 'Site Visit',
  proposal: 'Proposal',
  booking: 'Booking',
  'closed-won': 'Closed Won',
  'closed-lost': 'Closed Lost',
}

export function RootCause() {
  const { clusters, journeyHeatmap, responses } = useFeedbackData()
  const [selectedId, setSelectedId] = useState(clusters[0]?.id ?? '')

  const selected = clusters.find((c) => c.id === selectedId) ?? clusters[0]

  /* Stages that actually carry responses — an empty column teaches nothing. */
  const stages = STAGE_ORDER.filter((stage) =>
    journeyHeatmap.some((c) => c.stage === stage && c.responses > 0),
  )

  const cellFor = (stage: JourneyStage, touchpoint: TouchpointId) =>
    journeyHeatmap.find((c) => c.stage === stage && c.touchpoint === touchpoint)

  const worstDrag = clusters[0]
  const totalAffected = clusters.reduce((s, c) => s + c.affectedResponses, 0)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Issue clusters"
          value={formatNumber(clusters.length)}
          sub="Grouped from extracted themes"
          icon={Layers}
          accent="text-kpmg-violet"
          accentBg="bg-kpmg-violet/10"
        />
        <StatTile
          label="Complaints clustered"
          value={formatNumber(totalAffected)}
          sub={`of ${formatNumber(responses.length)} responses analysed`}
          icon={Repeat}
        />
        <StatTile
          label="Largest NPS drag"
          value={worstDrag ? `${worstDrag.npsDrag}` : '—'}
          sub={worstDrag?.label ?? ''}
          icon={TrendingDown}
          danger
        />
        <StatTile
          label="Strongest association"
          value={worstDrag ? worstDrag.correlation.toFixed(2) : '—'}
          sub="Diagnostic only, not causal"
          icon={Layers}
          accent="text-amber-600"
          accentBg="bg-amber-50"
        />
      </div>

      {/* Journey heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Journey heatmap — NPS by stage and touchpoint</CardTitle>
          <IllustrativeBadge />
        </CardHeader>
        <CardContent className="pb-4">
          <div className="overflow-x-auto scrollbar-slim">
            <table className="w-full min-w-[620px] border-separate border-spacing-[2px]">
              <thead>
                <tr>
                  <th className="pb-1 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Touchpoint
                  </th>
                  {stages.map((stage) => (
                    <th
                      key={stage}
                      className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      {STAGE_LABEL[stage]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TOUCHPOINT_ORDER.map((touchpoint) => (
                  <tr key={touchpoint}>
                    <td className="pr-2 text-[11.5px] text-slate-600">
                      {TOUCHPOINT_LABEL[touchpoint]}
                    </td>
                    {stages.map((stage) => {
                      const cell = cellFor(stage, touchpoint)
                      if (!cell) {
                        return (
                          <td key={stage}>
                            <div className="rounded-md bg-slate-50 py-2 text-center text-[11px] text-slate-300">
                              —
                            </div>
                          </td>
                        )
                      }
                      // Sequential single hue on detractor share, and the value
                      // is printed in every cell so colour is never the only cue.
                      const intensity = Math.min(1, cell.detractorPct / 60)
                      return (
                        <td key={stage}>
                          <div
                            title={`${formatNumber(cell.responses)} responses · NPS ${cell.nps} · ${cell.detractorPct}% detractors`}
                            className="rounded-md py-2 text-center"
                            style={{
                              backgroundColor: `rgba(220, 38, 38, ${
                                0.05 + intensity * 0.4
                              })`,
                            }}
                          >
                            <span className="nums text-[12px] font-bold text-slate-800">
                              {cell.nps}
                            </span>
                            <span className="nums block text-[9.5px] text-slate-500">
                              n={formatNumber(cell.responses)}
                            </span>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Cell shows NPS for that stage and touchpoint; shading is the
            detractor share. Hover for the full breakdown.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Clusters */}
        <Card className="flex min-w-0 flex-col">
          <CardHeader>
            <CardTitle>Issue clusters, worst drag first</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul>
              {clusters.map((cluster) => (
                <li key={cluster.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(cluster.id)}
                    className={cn(
                      'w-full border-b border-slate-100 px-4 py-2.5 text-left transition-colors last:border-0',
                      cluster.id === selected?.id
                        ? 'bg-kpmg-blue/[0.06]'
                        : 'hover:bg-slate-50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-[12.5px] font-semibold text-slate-900">
                        {cluster.label}
                      </p>
                      <span className="nums shrink-0 rounded-md bg-red-50 px-1.5 py-0.5 text-[11.5px] font-bold text-red-700">
                        {cluster.npsDrag} NPS
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {STAGE_LABEL[cluster.journeyStage]} ·{' '}
                      {TOUCHPOINT_LABEL[cluster.touchpoint]} ·{' '}
                      {formatNumber(cluster.repeatCount)} complaint
                      {cluster.repeatCount === 1 ? '' : 's'} ·{' '}
                      {cluster.projectIds.length} project
                      {cluster.projectIds.length === 1 ? '' : 's'}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Drill-down */}
        {selected && (
          <Card className="flex min-w-0 flex-col">
            <CardHeader>
              <CardTitle className="min-w-0 truncate">{selected.label}</CardTitle>
              <IllustrativeBadge />
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'NPS drag', value: `${selected.npsDrag}` },
                  {
                    label: 'Complaints',
                    value: formatNumber(selected.affectedResponses),
                  },
                  {
                    label: 'Association',
                    value: selected.correlation.toFixed(2),
                  },
                ].map((figure) => (
                  <div
                    key={figure.label}
                    className="rounded-lg bg-slate-50 px-2.5 py-2"
                  >
                    <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400">
                      {figure.label}
                    </p>
                    <p className="nums mt-0.5 text-[15px] font-bold text-slate-800">
                      {figure.value}
                    </p>
                  </div>
                ))}
              </div>

              <CorrelationNote value={selected.correlation} />

              <EvidenceList
                spans={selected.evidence}
                label="Representative responses"
              />

              <div className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Concentrated at
                </p>
                <p className="mt-0.5 text-[12px] font-semibold text-slate-700">
                  {STAGE_LABEL[selected.journeyStage]} stage ·{' '}
                  {TOUCHPOINT_LABEL[selected.touchpoint]} touchpoint
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
