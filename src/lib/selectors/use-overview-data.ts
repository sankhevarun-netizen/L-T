'use client'

import { useMemo } from 'react'

import { nextBestActionQueue, riskDigest, useAgentContext } from '@/lib/agents'
import { useCrmStore } from '@/store/crm-store'
import {
  selectConversionTrend,
  selectFunnel,
  selectKpiValues,
  selectOverallConversion,
  selectTopCampaigns,
} from './overview'
import { selectNpsSummary } from './feedback'

/**
 * Single subscription point for the Overview.
 *
 * Selectors sweep the full 12,842-lead book, so each result is memoised against
 * the slice it actually depends on — a lead flag recomputes the funnel and the
 * alerts without touching the campaign table.
 */
export function useOverviewData() {
  const ctx = useAgentContext()
  const { leads, bookings } = ctx

  // NPS comes from the feedback book, so the Overview shows satisfaction
  // beside revenue rather than hiding it one click into the rail.
  const surveyResponses = useCrmStore((s) => s.surveyResponses)
  const kpis = useMemo(
    () => selectKpiValues(leads, bookings, selectNpsSummary(surveyResponses).nps),
    [leads, bookings, surveyResponses],
  )
  const funnel = useMemo(() => selectFunnel(leads), [leads])
  const overallConversion = useMemo(
    () => selectOverallConversion(leads),
    [leads],
  )
  const trend = useMemo(() => selectConversionTrend(leads), [leads])
  const campaigns = useMemo(() => selectTopCampaigns(leads), [leads])

  // Both queues come from the agent layer — the same rule pass the Next Best
  // Action and Risk Dashboard agents run inside their detect step.
  const nextBestActions = useMemo(() => nextBestActionQueue(ctx), [ctx])
  const alerts = useMemo(() => riskDigest(ctx), [ctx])

  return {
    kpis,
    funnel,
    overallConversion,
    trend,
    campaigns,
    nextBestActions,
    alerts,
  }
}

/** The hero record the Overview snapshot and the demo script both centre on. */
export const HERO_LEAD_ID = 'MRD-79291'

export function useHeroLead() {
  const lead = useCrmStore((s) => s.leadsById[HERO_LEAD_ID])
  const engagements = useCrmStore((s) => s.engagements)
  const siteVisits = useCrmStore((s) => s.siteVisits)

  return useMemo(() => {
    if (!lead) return null
    return {
      lead,
      engagements: engagements.filter((e) => e.leadId === lead.id),
      siteVisits: siteVisits.filter((v) => v.leadId === lead.id),
    }
  }, [lead, engagements, siteVisits])
}
