'use client'

import { useMemo } from 'react'

import { CAMPAIGNS } from '@/data/reference'
import { useAIService } from '@/lib/ai/use-ai-service'
import { useCrmStore } from '@/store/crm-store'
import type { AgentContext } from './types'

/** Assembles everything the agents can see from the live CRM store. */
export function useAgentContext(): AgentContext {
  const leads = useCrmStore((s) => s.leads)
  const engagements = useCrmStore((s) => s.engagements)
  const siteVisits = useCrmStore((s) => s.siteVisits)
  const bookings = useCrmStore((s) => s.bookings)
  const payments = useCrmStore((s) => s.payments)
  const serviceTickets = useCrmStore((s) => s.serviceTickets)
  const tasks = useCrmStore((s) => s.tasks)
  const ingestedLeadIds = useCrmStore((s) => s.ingestedLeadIds)
  const surveyInvites = useCrmStore((s) => s.surveyInvites)
  const surveyResponses = useCrmStore((s) => s.surveyResponses)
  const recoveryCases = useCrmStore((s) => s.recoveryCases)
  const ai = useAIService()

  return useMemo(
    () => ({
      leads,
      engagements,
      siteVisits,
      bookings,
      payments,
      serviceTickets,
      tasks,
      campaigns: CAMPAIGNS,
      ingestedLeadIds,
      surveyInvites,
      surveyResponses,
      recoveryCases,
      ai,
    }),
    [
      leads,
      engagements,
      siteVisits,
      bookings,
      payments,
      serviceTickets,
      tasks,
      ingestedLeadIds,
      surveyInvites,
      surveyResponses,
      recoveryCases,
      ai,
    ],
  )
}
