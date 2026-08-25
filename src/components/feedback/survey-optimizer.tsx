'use client'

import { useState } from 'react'
import { Ban, Clock, Send, TrendingUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatTile } from '@/components/shared/stat-tile'
import { InitialsAvatar } from '@/components/shared/initials-avatar'
import { HumanReviewNote, IllustrativeBadge } from './guardrails'
import { useFeedbackData } from '@/lib/selectors/use-feedback-data'
import { formatNumber } from '@/lib/format'
import { useCrmStore } from '@/store/crm-store'
import { TOUCHPOINT_LABEL, type TouchpointId } from '@/types'
import type { SurveyInvite } from '@/types'
import { cn } from '@/lib/utils'

/**
 * AI Survey Participation Optimizer.
 *
 * Two halves, deliberately given equal weight. The queue is who to ask next;
 * the suppression list is who not to ask and why. An optimiser that only ever
 * says "send" is a mailing list — the restraint is what makes it a decision.
 */

/* Sequential, one hue, light to dark: propensity is magnitude, not identity. */
const BAND_STYLE: Record<
  'high' | 'medium' | 'low',
  { bar: string; chip: string; label: string }
> = {
  high: {
    bar: 'bg-kpmg-navy',
    chip: 'bg-kpmg-navy/10 text-kpmg-navy',
    label: 'High',
  },
  medium: {
    bar: 'bg-kpmg-blue',
    chip: 'bg-kpmg-blue/10 text-kpmg-blue',
    label: 'Medium',
  },
  low: {
    bar: 'bg-kpmg-lightblue',
    chip: 'bg-kpmg-lightblue/10 text-sky-700',
    label: 'Low',
  },
}

const CHANNEL_LABEL: Record<SurveyInvite['channel'], string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  sms: 'SMS',
  call: 'Call',
  'in-app': 'In-app',
}

function QueueRow({
  invite,
  band,
  onSchedule,
  scheduled,
}: {
  invite: SurveyInvite
  band: 'high' | 'medium' | 'low'
  onSchedule: () => void
  scheduled: boolean
}) {
  const [open, setOpen] = useState(false)
  const style = BAND_STYLE[band]

  return (
    <li className="border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <InitialsAvatar name={invite.customerName} />

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-[13px] font-semibold text-slate-900">
            {invite.customerName}
          </p>
          <p className="truncate text-[11.5px] text-slate-500">
            {TOUCHPOINT_LABEL[invite.touchpoint]} · {CHANNEL_LABEL[invite.channel]}{' '}
            · {invite.recommendedWindow}
          </p>
        </button>

        {/* Propensity: bar plus the number, never colour alone. */}
        <div className="hidden w-[120px] shrink-0 items-center gap-2 sm:flex">
          <div className="h-1.5 min-w-0 flex-1 rounded-full bg-slate-100">
            <div
              className={cn('h-full rounded-full', style.bar)}
              style={{ width: `${invite.responsePropensity}%` }}
            />
          </div>
          <span className="nums w-[28px] shrink-0 text-right text-[12px] font-bold text-slate-700">
            {invite.responsePropensity}
          </span>
        </div>

        <span
          className={cn(
            'hidden shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold md:inline-flex',
            style.chip,
          )}
        >
          {style.label}
        </span>

        <Button
          size="sm"
          variant={scheduled ? 'outline' : 'default'}
          disabled={scheduled}
          onClick={onSchedule}
          className="shrink-0"
        >
          {scheduled ? (
            'Scheduled'
          ) : (
            <>
              <Send />
              Schedule
            </>
          )}
        </Button>
      </div>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Why this person, this channel, this moment
          </p>
          <ul className="mt-1.5 space-y-1">
            {invite.signals.map((signal, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-slate-400" />
                <span className="text-[11.5px] leading-snug text-slate-600">
                  {signal}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}

export function SurveyOptimizer() {
  const { queue, propensityHeatmap } = useFeedbackData()
  const scheduleSurveyInvite = useCrmStore((s) => s.scheduleSurveyInvite)
  const [scheduled, setScheduled] = useState<Record<string, boolean>>({})

  const heatmapByTouchpoint = propensityHeatmap.reduce<
    Record<string, Record<string, number>>
  >((acc, cell) => {
    ;(acc[cell.touchpoint] ??= {})[cell.band] = cell.count
    return acc
  }, {})

  const touchpoints = Object.keys(heatmapByTouchpoint) as TouchpointId[]
  const maxCell = Math.max(1, ...propensityHeatmap.map((c) => c.count))

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="In the queue"
          value={formatNumber(queue.queued.length)}
          sub="Eligible, not yet sent"
          icon={Send}
        />
        <StatTile
          label="Mean propensity"
          value={`${queue.queueMeanPropensity}`}
          sub="Predicted response likelihood"
          icon={TrendingUp}
        />
        <StatTile
          label="Response rate"
          value={`${queue.responseRatePct}%`}
          sub={`${formatNumber(queue.respondedCount)} of ${formatNumber(queue.sentCount)} sent`}
          icon={Clock}
          accent="text-kpmg-teal"
          accentBg="bg-kpmg-teal/10"
        />
        <StatTile
          label="Held back"
          value={formatNumber(queue.suppressed.length)}
          sub="Fatigue or preference"
          icon={Ban}
          accent="text-amber-600"
          accentBg="bg-amber-50"
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* The queue */}
        <Card className="flex min-w-0 flex-col">
          <CardHeader>
            <CardTitle>Survey opportunity queue</CardTitle>
            <IllustrativeBadge />
          </CardHeader>
          <CardContent className="p-0">
            <ul>
              {queue.queued.slice(0, 12).map(({ invite, band }) => (
                <QueueRow
                  key={invite.id}
                  invite={invite}
                  band={band}
                  scheduled={Boolean(scheduled[invite.id])}
                  onSchedule={() => {
                    scheduleSurveyInvite(
                      invite.id,
                      `Predicted response likelihood ${invite.responsePropensity}%`,
                    )
                    setScheduled((s) => ({ ...s, [invite.id]: true }))
                  }}
                />
              ))}
            </ul>
            <div className="border-t border-slate-100 px-4 py-2.5">
              <HumanReviewNote>
                Nothing is sent until you schedule it. Each send writes a survey
                invite to the CRM activity feed.
              </HumanReviewNote>
            </div>
          </CardContent>
        </Card>

        {/* The restraint */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Ban className="size-4 text-amber-600" />
              Held back
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="max-h-[420px] overflow-y-auto scrollbar-slim">
              {queue.suppressed.slice(0, 8).map(({ invite }) => (
                <li
                  key={invite.id}
                  className="border-b border-slate-100 px-4 py-2.5 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[12.5px] font-semibold text-slate-900">
                      {invite.customerName}
                    </p>
                    <span className="nums shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-semibold text-amber-700">
                      {invite.fatigueScore} sent / 90d
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">
                    {invite.suppressedReason}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Response likelihood heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Response likelihood by touchpoint</CardTitle>
          <IllustrativeBadge />
        </CardHeader>
        <CardContent className="pb-4">
          <div className="overflow-x-auto scrollbar-slim">
            <table className="w-full min-w-[420px]">
              <thead>
                <tr>
                  <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Touchpoint
                  </th>
                  {(['high', 'medium', 'low'] as const).map((band) => (
                    <th
                      key={band}
                      className="pb-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      {BAND_STYLE[band].label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {touchpoints.map((touchpoint) => (
                  <tr key={touchpoint}>
                    <td className="py-1 pr-3 text-[12px] text-slate-600">
                      {TOUCHPOINT_LABEL[touchpoint]}
                    </td>
                    {(['high', 'medium', 'low'] as const).map((band) => {
                      const count = heatmapByTouchpoint[touchpoint]?.[band] ?? 0
                      return (
                        <td key={band} className="py-1 pl-1.5">
                          {/* Value printed in every cell — never colour alone. */}
                          <div
                            className="flex items-center justify-end rounded-md px-2 py-1.5"
                            style={{
                              backgroundColor: `rgba(0, 94, 184, ${
                                0.06 + (count / maxCell) * 0.42
                              })`,
                            }}
                          >
                            <span className="nums text-[12px] font-semibold text-slate-800">
                              {formatNumber(count)}
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
        </CardContent>
      </Card>
    </div>
  )
}
