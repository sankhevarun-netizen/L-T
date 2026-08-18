'use client'

import { create } from 'zustand'

import { buildSeedDataset } from '@/data/generator'
import { DEMO_NOW } from '@/data/reference'
import type {
  Booking,
  Customer,
  Engagement,
  Lead,
  Payment,
  ServiceTicket,
  SfActivity,
  SfTask,
  SiteVisit,
  Transcript,
} from '@/types'

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

  resetDemoData: () => void
}

function seedState() {
  const data = buildSeedDataset()
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
      const fresh = leadIds.filter((id) => !state.ingestedLeadIds.includes(id))
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

  resetDemoData: () => {
    activitySeq = 0
    taskSeq = 0
    set(seedState())
  },
}))
