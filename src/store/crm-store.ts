'use client'

import { create } from 'zustand'

import { buildSeedDataset } from '@/data/generator'
import { DATA_SOURCE_SEEDS, buildFeedback } from '@/data/feedback-generator'
import { DEMO_NOW, REPS } from '@/data/reference'
import { THEME_DEFS_BY_ID } from '@/data/feedback'
import type {
  Booking,
  TouchpointId,
  Customer,
  Engagement,
  Lead,
  Payment,
  RecoveryCase,
  ServiceTicket,
  SfActivity,
  SfTask,
  SiteVisit,
  SurveyInvite,
  SurveyResponse,
  Transcript,
} from '@/types'
import { TOUCHPOINT_LABEL } from '@/types'

/**
 * The in-memory Salesforce stand-in.
 *
 * Everything the app reads lives here, and every write lands here — so flagging
 * a lead from a transcript, a copilot or an agent shows up immediately on the
 * Overview, the Customer 360 and the activity feed with no plumbing in between.
 *
 * Seed generation is deterministic, so the state the server renders and the
 * state the browser hydrates are identical.
 */

let activitySeq = 0
let taskSeq = 0
let recoverySeq = 0

function nextId(prefix: string, seq: number) {
  return `${prefix}-${String(seq).padStart(5, '0')}`
}

export interface CrmState {
  leads: Lead[]
  leadsById: Record<string, Lead>
  customers: Customer[]
  engagements: Engagement[]
  siteVisits: SiteVisit[]
  bookings: Booking[]
  payments: Payment[]
  serviceTickets: ServiceTicket[]
  transcripts: Transcript[]
  tasks: SfTask[]
  activities: SfActivity[]
  surveyInvites: SurveyInvite[]
  surveyResponses: SurveyResponse[]
  recoveryCases: RecoveryCase[]

  /** Campaigns DICE has suppressed outreach on. */
  suppressedCampaignIds: string[]
  /** Leads whose interaction history has been ingested and sanitised. */
  ingestedLeadIds: string[]

  /* ---- writes ---- */
  updateLead: (
    id: string,
    patch: Partial<Lead>,
    meta?: { source?: SfActivity['source']; action?: string; detail?: string },
  ) => void
  flagLead: (
    id: string,
    flags: Partial<
      Pick<Lead, 'intent' | 'cold' | 'dnd' | 'crmStatus' | 'evidenceStatus' | 'score'>
    >,
    reason: string,
    source?: SfActivity['source'],
  ) => void
  createTask: (input: {
    subject: string
    whatId: string
    ownerId: string
    dueInDays?: number
    priority?: SfTask['priority']
    createdBy?: SfTask['createdBy']
  }) => SfTask
  completeTask: (id: string) => void
  logActivity: (input: Omit<SfActivity, 'id' | 'at'> & { at?: string }) => void
  upsertContact: (customer: Customer) => void
  suppressCampaign: (campaignId: string, reason: string) => void
  ingestSanitizedData: (leadIds: string[]) => void

  /* ---- feedback writes ---- */
  createRecoveryCase: (input: {
    responseId: string
    leadId: string
    ownerId: string
    severity: RecoveryCase['severity']
    themeId: string
    slaDays: number
    recommendedResponse: string
    sourceTicketId?: string
  }) => RecoveryCase
  updateRecoveryCase: (
    id: string,
    patch: Partial<RecoveryCase>,
    note?: string,
  ) => void
  scheduleSurveyInvite: (inviteId: string, reason: string) => void
  suppressSurveyInvite: (inviteId: string, reason: string) => void
  /**
   * Resolves a post-sales ticket.
   *
   * Tickets were immutable, so the loop the platform is built to close could
   * never actually be closed: it flagged that advocacy was at risk and nothing
   * could act on it.
   */
  resolveServiceTicket: (id: string, note: string) => void
  /**
   * Regenerates the feedback book for a data source.
   *
   * Only feedback is rebuilt: the lead book, campaigns and reps are the same
   * organisation either way, so re-rolling them would make the switch look like
   * a different company rather than a different feed.
   */
  setFeedbackSource: (source: 'example' | 'client') => void
  /**
   * How many times the feedback book has been re-rolled. 0 is the canonical
   * book every rehearsed figure refers to.
   */
  feedbackVariant: number
  /**
   * Draws a fresh feedback book.
   *
   * Deliberately separate from reset, which restores. Reset promises the same
   * numbers every time so a rehearsed line still holds; this promises new ones.
   * One button cannot make both promises.
   */
  shuffleFeedback: (source: 'example' | 'client') => void

  /**
   * Restores the seeded state.
   *
   * Takes the active source, because rebuilding from the default seed while
   * the interface still reads "Client" would relabel one feed as the other --
   * the exact mislabelling the standing notice exists to prevent.
   */
  resetDemoData: (source?: 'example' | 'client') => void
}


/**
 * One line for the activity feed, specific to the case rather than to its
 * severity band. Falls back gracefully if the source response is missing.
 */
function recoveryCaseDetail(
  recoveryCase: RecoveryCase,
  response: SurveyResponse | undefined,
): string {
  const owner = REPS.find((r) => r.id === recoveryCase.ownerId)?.name ?? 'Customer Care'

  /*
   * Leads with a quoted fragment of the verbatim, not the theme. The theme
   * repeats across the top of the queue by construction — the same complaint
   * genuinely is the dominant one — so a feed built from theme + touchpoint
   * still collapsed to a handful of lines for the worst detractors. The
   * customer's own words are unique per response, which is also the standard
   * the rest of this feature already holds evidence to.
   */
  const quote = response
    ? `"${response.verbatim.slice(0, 64)}${response.verbatim.length > 64 ? '…' : ''}"`
    : THEME_DEFS_BY_ID[recoveryCase.themeId]?.label ?? `${recoveryCase.severity} severity`

  const touchpoint = response
    ? TOUCHPOINT_LABEL[response.touchpoint as TouchpointId]
    : undefined

  const sla = Math.round(
    (new Date(recoveryCase.slaDueAt).getTime() -
      new Date(recoveryCase.openedAt).getTime()) /
      86_400_000,
  )

  return `${quote}${touchpoint ? ` · ${touchpoint}` : ''} · SLA ${sla}d · owner ${owner}`
}

function seedState(source: 'example' | 'client' = 'example') {
  const data = buildSeedDataset()

  // The generator seeds feedback for the example book; re-roll it when the
  // connected feed is the one selected.
  if (source === 'client') {
    Object.assign(
      data,
      buildFeedback({
        leads: data.leads,
        bookings: data.bookings,
        siteVisits: data.siteVisits,
        serviceTickets: data.serviceTickets,
        payments: data.payments,
        engagements: data.engagements,
        seed: DATA_SOURCE_SEEDS.client,
      }),
    )
  }

  const leadsById: Record<string, Lead> = {}
  for (const lead of data.leads) leadsById[lead.id] = lead

  return {
    leads: data.leads,
    leadsById,
    customers: data.customers,
    engagements: data.engagements,
    siteVisits: data.siteVisits,
    bookings: data.bookings,
    payments: data.payments,
    serviceTickets: data.serviceTickets,
    transcripts: data.transcripts,
    tasks: data.tasks,
    activities: [] as SfActivity[],
    feedbackVariant: 0,
    surveyInvites: data.surveyInvites,
    surveyResponses: data.surveyResponses,
    recoveryCases: data.recoveryCases,
    suppressedCampaignIds: [] as string[],
    // Only leads whose history has been ingested can be reasoned over.
    ingestedLeadIds: data.leads.filter((l) => l.ingested).map((l) => l.id),
  }
}

export const useCrmStore = create<CrmState>((set, get) => ({
  ...seedState(),

  updateLead: (id, patch, meta) =>
    set((state) => {
      const existing = state.leadsById[id]
      if (!existing) return state

      const updated = { ...existing, ...patch }
      const changes = Object.entries(patch)
        .filter(([key]) => existing[key as keyof Lead] !== patch[key as keyof Lead])
        .map(([field, after]) => ({
          field,
          before: String(existing[field as keyof Lead] ?? '—'),
          after: String(after ?? '—'),
        }))

      activitySeq += 1
      const activity: SfActivity = {
        id: nextId('ACT', activitySeq),
        object: 'Lead',
        recordId: id,
        recordName: existing.name,
        action: meta?.action ?? 'Lead updated',
        detail: meta?.detail ?? `${changes.length} field(s) updated`,
        source: meta?.source ?? 'DICE',
        changes,
        at: DEMO_NOW.toISOString(),
      }

      return {
        leads: state.leads.map((l) => (l.id === id ? updated : l)),
        leadsById: { ...state.leadsById, [id]: updated },
        activities: [activity, ...state.activities],
      }
    }),

  flagLead: (id, flags, reason, source = 'DICE') =>
    get().updateLead(id, flags, {
      source,
      action: 'Lead flagged',
      detail: reason,
    }),

  createTask: (input) => {
    taskSeq += 1
    const dueAt = new Date(
      DEMO_NOW.getTime() + (input.dueInDays ?? 1) * 86_400_000,
    ).toISOString()

    const task: SfTask = {
      id: nextId('TSK-NEW', taskSeq),
      subject: input.subject,
      whatId: input.whatId,
      ownerId: input.ownerId,
      dueAt,
      priority: input.priority ?? 'Normal',
      status: 'Open',
      createdBy: input.createdBy ?? 'DICE',
      createdAt: DEMO_NOW.toISOString(),
    }

    activitySeq += 1
    const lead = get().leadsById[input.whatId]
    const activity: SfActivity = {
      id: nextId('ACT', activitySeq),
      object: 'Task',
      recordId: task.id,
      recordName: lead?.name ?? input.whatId,
      action: 'Task created',
      detail: task.subject,
      source: task.createdBy,
      at: DEMO_NOW.toISOString(),
    }

    set((state) => ({
      tasks: [task, ...state.tasks],
      activities: [activity, ...state.activities],
    }))

    return task
  },

  completeTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id ? { ...t, status: 'Completed' as const } : t,
      ),
    })),

  logActivity: (input) =>
    set((state) => {
      activitySeq += 1
      return {
        activities: [
          {
            ...input,
            id: nextId('ACT', activitySeq),
            at: input.at ?? DEMO_NOW.toISOString(),
          },
          ...state.activities,
        ],
      }
    }),

  upsertContact: (customer) =>
    set((state) => {
      const exists = state.customers.some((c) => c.id === customer.id)
      activitySeq += 1
      return {
        customers: exists
          ? state.customers.map((c) => (c.id === customer.id ? customer : c))
          : [customer, ...state.customers],
        activities: [
          {
            id: nextId('ACT', activitySeq),
            object: 'Contact' as const,
            recordId: customer.id,
            recordName: customer.name,
            action: exists ? 'Contact updated' : 'Contact created',
            detail: `${customer.name} · ${customer.preferredLocation}`,
            source: 'DICE' as const,
            at: DEMO_NOW.toISOString(),
          },
          ...state.activities,
        ],
      }
    }),

  suppressCampaign: (campaignId, reason) =>
    set((state) => {
      if (state.suppressedCampaignIds.includes(campaignId)) return state
      activitySeq += 1
      return {
        suppressedCampaignIds: [...state.suppressedCampaignIds, campaignId],
        activities: [
          {
            id: nextId('ACT', activitySeq),
            object: 'Activity' as const,
            recordId: campaignId,
            recordName: campaignId,
            action: 'Campaign outreach suppressed',
            detail: reason,
            source: 'DICE' as const,
            at: DEMO_NOW.toISOString(),
          },
          ...state.activities,
        ],
      }
    }),

  /**
   * Represents cleaned customer data arriving in Salesforce through the EAI
   * layer. Ingested leads become eligible for DICE reasoning, and each batch
   * is written to the activity feed so the pipeline is visible in the UI.
   */
  ingestSanitizedData: (leadIds) =>
    set((state) => {
      // Set lookup, not includes(): nothing called this until the demo menu
      // gained an Ingest action, and a batch checked against a list that
      // grows to 12k would be O(n*m) on every click.
      const already = new Set(state.ingestedLeadIds)
      const fresh = leadIds.filter((id) => !already.has(id))
      if (!fresh.length) return state

      activitySeq += 1
      return {
        ingestedLeadIds: [...state.ingestedLeadIds, ...fresh],
        activities: [
          {
            id: nextId('ACT', activitySeq),
            object: 'Lead' as const,
            recordId: fresh[0],
            recordName: `${fresh.length} record(s)`,
            action: 'Sanitized data ingested',
            detail: `${fresh.length} record(s) cleaned and written to Salesforce via EAI`,
            source: 'EAI Ingestion' as const,
            at: DEMO_NOW.toISOString(),
          },
          ...state.activities,
        ],
      }
    }),

  /**
   * Opens a recovery case. Called only after a human approves the agent's
   * recommendation — the copilot proposes, the user commits.
   */
  createRecoveryCase: (input) => {
    recoverySeq += 1
    const response = get().surveyResponses.find((r) => r.id === input.responseId)
    const name = response?.customerName ?? input.leadId
    const owner = REPS.find((r) => r.id === input.ownerId)?.name ?? 'Customer Care'

    const recoveryCase: RecoveryCase = {
      id: nextId('REC-NEW', recoverySeq),
      responseId: input.responseId,
      leadId: input.leadId,
      customerName: name,
      severity: input.severity,
      themeId: input.themeId,
      ownerId: input.ownerId,
      openedAt: DEMO_NOW.toISOString(),
      slaDueAt: new Date(
        DEMO_NOW.getTime() + input.slaDays * 86_400_000,
      ).toISOString(),
      status: 'open',
      recommendedResponse: input.recommendedResponse,
      escalationPath: [owner, 'Customer Care lead', 'Head of CX'],
      timeline: [
        {
          at: DEMO_NOW.toISOString(),
          actor: 'DICE',
          note: 'Recovery case opened after human review of the recommendation.',
        },
      ],
      sourceTicketId: input.sourceTicketId,
    }

    activitySeq += 1
    set((state) => ({
      recoveryCases: [recoveryCase, ...state.recoveryCases],
      activities: [
        {
          id: nextId('ACT', activitySeq),
          object: 'Activity' as const,
          recordId: recoveryCase.id,
          recordName: name,
          action: 'Recovery case opened',
          // Names the actual theme, touchpoint and owner rather than repeating
          // severity and SLA — those two are tightly correlated (severity
          // decides the SLA), so a feed built from only them collapses to the
          // same line for every critical case regardless of who it is about.
          detail: recoveryCaseDetail(recoveryCase, response),
          source: 'DICE' as const,
          at: DEMO_NOW.toISOString(),
        },
        ...state.activities,
      ],
    }))

    return recoveryCase
  },

  updateRecoveryCase: (id, patch, note) =>
    set((state) => {
      const existing = state.recoveryCases.find((c) => c.id === id)
      if (!existing) return state

      const updated: RecoveryCase = {
        ...existing,
        ...patch,
        // Closing always stamps the demo clock, so a case closed live sits on
        // the same timeline as every seeded one.
        closedAt:
          patch.status === 'closed'
            ? (patch.closedAt ?? DEMO_NOW.toISOString())
            : (patch.closedAt ?? existing.closedAt),
        timeline: note
          ? [
              ...existing.timeline,
              { at: DEMO_NOW.toISOString(), actor: 'DICE', note },
            ]
          : existing.timeline,
      }

      activitySeq += 1
      return {
        recoveryCases: state.recoveryCases.map((c) => (c.id === id ? updated : c)),
        activities: [
          {
            id: nextId('ACT', activitySeq),
            object: 'Activity' as const,
            recordId: id,
            recordName: existing.customerName,
            action: `Recovery case ${patch.status ?? 'updated'}`,
            detail: note ?? `${Object.keys(patch).length} field(s) updated`,
            source: 'DICE' as const,
            at: DEMO_NOW.toISOString(),
          },
          ...state.activities,
        ],
      }
    }),

  scheduleSurveyInvite: (inviteId, reason) =>
    set((state) => {
      const invite = state.surveyInvites.find((i) => i.id === inviteId)
      if (!invite) return state

      const updated: SurveyInvite = {
        ...invite,
        status: 'sent',
        eligible: true,
        suppressedReason: undefined,
        sentAt: DEMO_NOW.toISOString(),
      }

      activitySeq += 1
      return {
        surveyInvites: state.surveyInvites.map((i) =>
          i.id === inviteId ? updated : i,
        ),
        activities: [
          {
            id: nextId('ACT', activitySeq),
            object: 'Activity' as const,
            recordId: inviteId,
            recordName: invite.customerName,
            action: 'Survey invite scheduled',
            detail: `${invite.channel} · ${invite.recommendedWindow} — ${reason}`,
            source: 'DICE' as const,
            at: DEMO_NOW.toISOString(),
          },
          ...state.activities,
        ],
      }
    }),

  suppressSurveyInvite: (inviteId, reason) =>
    set((state) => {
      const invite = state.surveyInvites.find((i) => i.id === inviteId)
      if (!invite) return state

      const updated: SurveyInvite = {
        ...invite,
        status: 'suppressed',
        eligible: false,
        suppressedReason: reason,
      }

      activitySeq += 1
      return {
        surveyInvites: state.surveyInvites.map((i) =>
          i.id === inviteId ? updated : i,
        ),
        activities: [
          {
            id: nextId('ACT', activitySeq),
            object: 'Activity' as const,
            recordId: inviteId,
            recordName: invite.customerName,
            action: 'Survey invite suppressed',
            detail: reason,
            source: 'DICE' as const,
            at: DEMO_NOW.toISOString(),
          },
          ...state.activities,
        ],
      }
    }),

  resolveServiceTicket: (id, note) =>
    set((state) => {
      const existing = state.serviceTickets.find((t) => t.id === id)
      if (!existing || existing.status === 'resolved') return state

      const updated: ServiceTicket = {
        ...existing,
        status: 'resolved',
        resolvedAt: DEMO_NOW.toISOString(),
      }

      activitySeq += 1
      return {
        serviceTickets: state.serviceTickets.map((t) =>
          t.id === id ? updated : t,
        ),
        activities: [
          {
            id: nextId('ACT', activitySeq),
            object: 'Activity' as const,
            recordId: id,
            recordName: existing.customerName,
            action: 'Service ticket resolved',
            detail: note,
            source: 'Rep' as const,
            at: DEMO_NOW.toISOString(),
          },
          ...state.activities,
        ],
      }
    }),

  shuffleFeedback: (source) =>
    set((state) => {
      const variant = state.feedbackVariant + 1
      // Stepped by a prime rather than randomised, so a given variant number
      // always reproduces the same book. Press it twice, go back, press it
      // twice again, and you land on the same figures.
      const feedback = buildFeedback({
        leads: state.leads,
        bookings: state.bookings,
        siteVisits: state.siteVisits,
        serviceTickets: state.serviceTickets,
        payments: state.payments,
        engagements: state.engagements,
        seed: DATA_SOURCE_SEEDS[source] + variant * 7919,
      })

      activitySeq += 1
      return {
        ...feedback,
        feedbackVariant: variant,
        activities: [
          {
            id: nextId('ACT', activitySeq),
            object: 'Activity' as const,
            recordId: 'data-source',
            recordName: `Variant ${variant}`,
            action: 'Feedback book re-rolled',
            detail: `${feedback.surveyResponses.length} responses loaded`,
            source: 'EAI Ingestion' as const,
            at: DEMO_NOW.toISOString(),
          },
          ...state.activities,
        ],
      }
    }),

  setFeedbackSource: (source) =>
    set((state) => {
      const feedback = buildFeedback({
        leads: state.leads,
        bookings: state.bookings,
        siteVisits: state.siteVisits,
        serviceTickets: state.serviceTickets,
        payments: state.payments,
        engagements: state.engagements,
        seed: DATA_SOURCE_SEEDS[source],
      })

      activitySeq += 1
      return {
        ...feedback,
        feedbackVariant: 0,
        activities: [
          {
            id: nextId('ACT', activitySeq),
            object: 'Activity' as const,
            recordId: 'data-source',
            recordName: source === 'client' ? 'Client org' : 'Example data',
            action: 'Feedback source switched',
            detail: `${feedback.surveyResponses.length} responses loaded`,
            source: 'EAI Ingestion' as const,
            at: DEMO_NOW.toISOString(),
          },
          ...state.activities,
        ],
      }
    }),

  resetDemoData: (source = 'example') => {
    activitySeq = 0
    taskSeq = 0
    recoverySeq = 0
    // Back to variant 0 -- the book every rehearsed number refers to.
    set(seedState(source))
  },
}))
