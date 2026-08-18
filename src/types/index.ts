/**
 * Shared domain types for DICE.
 *
 * The whole app reads its shapes from here — seed data, the simulated CRM,
 * the Zustand stores and every selector.
 */

/* ------------------------------------------------------------------ */
/* Shared enums / unions                                               */
/* ------------------------------------------------------------------ */

/** Ordered — index position drives funnel maths. See STAGE_ORDER. */
export type JourneyStage =
  | 'lead'
  | 'engaged'
  | 'qualified'
  | 'site-visit'
  | 'proposal'
  | 'booking'
  | 'closed-won'
  | 'closed-lost'

export const STAGE_ORDER: JourneyStage[] = [
  'lead',
  'engaged',
  'qualified',
  'site-visit',
  'proposal',
  'booking',
  'closed-won',
]

export type IntentLevel = 'high' | 'medium' | 'low' | 'cold'

export type Sentiment = 'positive' | 'neutral' | 'negative'

export type EngagementChannel =
  | 'call'
  | 'email'
  | 'whatsapp'
  | 'website'
  | 'site-visit'

export type Severity = 'critical' | 'high' | 'medium' | 'info'

export type Trend = 'up' | 'down' | 'flat'

/**
 * What the CRM record claims. The pitch turns on `crmStatus` diverging from
 * `evidenceStatus` — a rep marking "Interested" with nothing to back it up.
 */
export type CrmStatus =
  | 'New'
  | 'Contacted'
  | 'Interested'
  | 'Qualified'
  | 'Site Visit Scheduled'
  | 'Proposal Sent'
  | 'Negotiation'
  | 'Booked'
  | 'Closed Won'
  | 'Closed Lost'
  | 'Cold'
  | 'Do Not Contact'

/** What the interaction history actually supports. */
export type EvidenceStatus =
  | 'unverified'
  | 'weak-evidence'
  | 'supported'
  | 'strong-evidence'
  | 'contradicted'

/* ------------------------------------------------------------------ */
/* Core records                                                        */
/* ------------------------------------------------------------------ */

/** Behavioural signals DICE reasons over — the "evidence" half of the story. */
export interface LeadEvidence {
  websiteVisits: number
  brochureViews: number
  emailOpens: number
  callsAnswered: number
  callsAttempted: number
  whatsappReplies: number
  projectsViewed: number
  siteVisitsAttended: number
  /** Days since the last inbound or outbound touch, at DEMO_NOW. */
  daysSinceLastActivity: number
}

export interface Lead {
  id: string
  name: string
  email: string
  phone: string

  /** 0–100 DICE lead score. */
  score: number
  intent: IntentLevel
  stage: JourneyStage

  budgetCr: number
  preferredLocation: string
  interestedProjectIds: string[]
  familySize: number

  sourceCampaignId: string
  ownerId: string

  /** The divergence at the heart of the pitch. */
  crmStatus: CrmStatus
  evidenceStatus: EvidenceStatus

  sentiment: Sentiment
  dnd: boolean
  cold: boolean

  evidence: LeadEvidence
  /** Authored evidence summary for featured leads; generated otherwise. */
  evidenceNote?: string

  /** True for the hand-authored profiles with full journeys. */
  featured: boolean
  /**
   * Interaction history has been sanitised and ingested through EAI, so DICE
   * can reason over this record. Kept separate from "has engagement rows" —
   * generated leads carry conversation history for the Engagements view
   * without entering the next-best-action queue.
   */
  ingested?: boolean

  createdAt: string
  lastActivityAt: string
}

export interface Customer {
  id: string
  leadId: string
  name: string
  email: string
  phone: string
  personaId?: string
  budgetCr: number
  preferredLocation: string
  familySize: number
  intent: IntentLevel
  stage: JourneyStage
  occupation: string
  /** Set for the NRI persona — drives the Virtual Selling Assistant scenario. */
  isNri: boolean
}

export interface Persona {
  id: string
  name: string
  /** Compact label for board columns and badges. */
  shortName: string
  description: string
  budgetBand: string
  budgetRangeCr: [number, number]
  typicalFamilySize: string
  motivations: string[]
  objections: string[]
  channels: string[]
  buyingTriggers: string[]
  preferredProjectTypes: string[]
  /** Project ids from PROJECTS. */
  bestFitProjects: string[]
  playbook: string
  /** Validated categorical hue for the persona board. */
  color: string
}

/** One persona scored against a lead, with the evidence behind the score. */
export interface PersonaMatch {
  personaId: string
  /** 0–100, normalised across all personas. */
  confidence: number
  rawScore: number
  signals: string[]
}

export interface PersonaAssignment {
  leadId: string
  best: PersonaMatch
  runnerUp?: PersonaMatch
  all: PersonaMatch[]
}

export interface Engagement {
  id: string
  leadId: string
  channel: EngagementChannel
  direction: 'inbound' | 'outbound'
  sentiment: Sentiment
  subject: string
  summary: string
  /** Minutes, for calls. */
  durationMins?: number
  occurredAt: string
}

export interface SiteVisit {
  id: string
  leadId: string
  projectId: string
  projectName: string
  scheduledAt: string
  attended: boolean
  feedback?: string
  objection?: string
  outcome?: 'booked' | 'considering' | 'dropped' | 'pending'
}

export interface Booking {
  id: string
  leadId: string
  projectId: string
  projectName: string
  unitType: string
  valueCr: number
  bookedAt: string
  closedWon: boolean
}

export interface Payment {
  id: string
  bookingId: string
  leadId: string
  milestone: string
  amountCr: number
  dueAt: string
  paidAt?: string
  status: 'paid' | 'due' | 'overdue'
}

export interface ServiceTicket {
  id: string
  leadId: string
  customerName: string
  subject: string
  category: string
  severity: Severity
  openedAt: string
  slaDueAt: string
  resolvedAt?: string
  status: 'open' | 'in-progress' | 'resolved'
  detail: string
}

export interface Campaign {
  id: string
  name: string
  channel: string
  startedAt: string
  spendLakh: number
}

export interface Project {
  id: string
  name: string
  location: string
  priceRangeCr: [number, number]
  possession: string
  unitTypes: string[]
}

export interface TranscriptLine {
  speaker: 'rep' | 'customer'
  text: string
  /** Seconds from call start — drives the live-transcript playback. */
  atSecond: number
}

export interface Transcript {
  id: string
  leadId: string
  title: string
  scenario: 'dnd' | 'deferred' | 'hot-intent'
  repName: string
  recordedAt: string
  lines: TranscriptLine[]
}

export interface AgentAction {
  id: string
  agentId: string
  leadId?: string
  label: string
  reason: string
  createdAt: string
  status: 'suggested' | 'executed' | 'dismissed'
}

export interface RiskAlert {
  id: string
  severity: Severity
  headline: string
  detail: string
  impactedRevenueCr?: number
  ownerId?: string
  raisedAt: string
  /** Route the alert drills into. */
  href?: string
}

export interface SalesRep {
  id: string
  name: string
  initials: string
  territory: string
}

export interface RepPerformance {
  id: string
  name: string
  initials: string
  leadsOwned: number
  avgResponseHours: number
  followUpBacklog: number
  siteVisitsBooked: number
  conversions: number
  revenueCr: number
}

/* ------------------------------------------------------------------ */
/* Simulated Salesforce objects                                        */
/* ------------------------------------------------------------------ */

export interface SfTask {
  id: string
  subject: string
  whatId: string
  ownerId: string
  dueAt: string
  priority: 'High' | 'Normal' | 'Low'
  status: 'Open' | 'Completed'
  createdBy: 'DICE' | 'Agentforce' | 'Rep'
  createdAt: string
}

export interface SfActivity {
  id: string
  /** Salesforce object the write landed on. */
  object: 'Lead' | 'Contact' | 'Opportunity' | 'Task' | 'Activity'
  recordId: string
  recordName: string
  action: string
  detail: string
  source: 'DICE' | 'Agentforce' | 'Rep' | 'EAI Ingestion'
  /** Field-level before → after, for the "what DICE changed" panels. */
  changes?: { field: string; before: string; after: string }[]
  at: string
}

/**
 * The comparison block the pitch leans on: what native Agentforce sees on a
 * record versus what DICE adds on top.
 */
export interface AgentforceVsDice {
  agentforceView: {
    status: string
    lastSyncedAt: string
    gaps: string[]
  }
  diceView: {
    status: string
    evidenceStatus: EvidenceStatus
    score: number
    adds: string[]
  }
}
