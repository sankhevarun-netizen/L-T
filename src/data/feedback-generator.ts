import {
  FEATURED_INVITES,
  THEME_DEFS,
  FEATURED_RESPONSES,
  VERBATIM_POOLS,
  npsBandFor,
} from './feedback'
import { DEMO_NOW, PROJECTS, REPS } from './reference'
import { Rng } from './rng'
import type {
  Booking,
  Lead,
  RecoveryCase,
  Sentiment,
  ServiceTicket,
  Severity,
  SiteVisit,
  SurveyChannel,
  SurveyInvite,
  SurveyResponse,
  TouchpointId,
} from '@/types'

/**
 * Feedback seed generation.
 *
 * Runs on its own PRNG instance, seeded independently of the lead generator.
 * Sharing the sequence would shift every draw after it and silently move the
 * headline funnel numbers, so the two are kept apart on purpose.
 *
 * Authored records land first — same convention as FEATURED_PROFILES — and
 * generated volume fills in around them.
 */

/** Deliberately not the lead generator's 20260531. */
const FEEDBACK_SEED = 20260601

/** Target share of sent invites that come back. */
const RESPONSE_RATE = 0.39

function isoDaysBefore(days: number) {
  return new Date(DEMO_NOW.getTime() - days * 86_400_000).toISOString()
}

const PROJECT_NAME = Object.fromEntries(
  PROJECTS.map((p) => [p.id, p.name]),
) as Record<string, string>

/** Channels weighted the way an Indian developer's book actually responds. */
const CHANNELS: SurveyChannel[] = [
  'whatsapp',
  'whatsapp',
  'whatsapp',
  'email',
  'email',
  'sms',
  'call',
]

const WINDOWS = [
  'Tue 10:00-12:00',
  'Wed 18:00-20:00',
  'Thu 19:00-21:00',
  'Sat 11:00-13:00',
  'Sun 17:00-19:00',
]

/**
 * Which touchpoints a lead has actually reached.
 *
 * A survey about handover sent to someone who has not booked is the exact
 * irrelevance the Dynamic Feedback Journey exists to prevent, so eligibility is
 * derived from the records rather than assigned at random.
 */
function touchpointsFor(
  lead: Lead,
  hasVisit: boolean,
  hasBooking: boolean,
  hasTicket: boolean,
): TouchpointId[] {
  const out: TouchpointId[] = []
  const engagedEnough =
    lead.stage !== 'lead' && lead.stage !== 'closed-lost' && !lead.dnd
  if (engagedEnough) out.push('sales')
  if (hasVisit) out.push('site-visit')
  if (hasBooking) out.push('documentation', 'payment')
  if (lead.stage === 'closed-won') out.push('handover')
  if (hasTicket) out.push('service')
  return out
}

/** Sentiment skews by touchpoint — post-sales is where satisfaction leaks. */
const NEGATIVE_RATE: Record<TouchpointId, number> = {
  sales: 0.14,
  'site-visit': 0.16,
  documentation: 0.34,
  payment: 0.22,
  handover: 0.31,
  service: 0.38,
}

function sentimentFor(rng: Rng, touchpoint: TouchpointId): Sentiment {
  const negative = NEGATIVE_RATE[touchpoint]
  const roll = rng.float()
  if (roll < negative) return 'negative'
  if (roll < negative + 0.26) return 'neutral'
  return 'positive'
}

function npsFor(rng: Rng, sentiment: Sentiment) {
  if (sentiment === 'negative') return rng.int(0, 6)
  if (sentiment === 'neutral') return rng.int(6, 8)
  return rng.int(9, 10)
}

function csatFor(rng: Rng, sentiment: Sentiment) {
  if (sentiment === 'negative') return rng.int(1, 2)
  if (sentiment === 'neutral') return rng.int(3, 3)
  return rng.int(4, 5)
}

function propensityFor(rng: Rng, lead: Lead, fatigue: number) {
  // Recency of contact and demonstrated channel responsiveness do most of the
  // work; fatigue drags it down. Illustrative until validated with client data.
  const recency = Math.max(0, 40 - lead.evidence.daysSinceLastActivity * 1.6)
  const responsiveness = Math.min(
    30,
    lead.evidence.whatsappReplies * 2.5 + lead.evidence.emailOpens * 1.2,
  )
  const answered = Math.min(15, lead.evidence.callsAnswered * 3)
  const base = 18 + recency + responsiveness + answered - fatigue * 9
  return Math.max(4, Math.min(96, Math.round(base + rng.float(-6, 6))))
}

function signalsFor(lead: Lead, touchpoint: TouchpointId, fatigue: number) {
  const out = [
    `Last activity ${lead.evidence.daysSinceLastActivity} day(s) ago`,
    `${lead.evidence.whatsappReplies} WhatsApp repl(ies), ${lead.evidence.emailOpens} email open(s) logged`,
    `Reached the ${touchpoint.replace('-', ' ')} touchpoint at stage "${lead.stage}"`,
  ]
  if (fatigue > 0) out.push(`${fatigue} survey(s) already sent in 90 days`)
  return out
}

export interface FeedbackDataset {
  surveyInvites: SurveyInvite[]
  surveyResponses: SurveyResponse[]
  recoveryCases: RecoveryCase[]
}

export function buildFeedback(input: {
  leads: Lead[]
  bookings: Booking[]
  siteVisits: SiteVisit[]
  serviceTickets: ServiceTicket[]
}): FeedbackDataset {
  const rng = new Rng(FEEDBACK_SEED)

  const { leads, bookings, siteVisits, serviceTickets } = input
  const leadsById = new Map(leads.map((l) => [l.id, l]))

  const bookedLeadIds = new Set(bookings.map((b) => b.leadId))
  const visitedLeadIds = new Set(
    siteVisits.filter((v) => v.attended).map((v) => v.leadId),
  )
  const ticketsByLead = new Map<string, ServiceTicket[]>()
  for (const t of serviceTickets) {
    const list = ticketsByLead.get(t.leadId)
    if (list) list.push(t)
    else ticketsByLead.set(t.leadId, [t])
  }
  const projectByLead = new Map(bookings.map((b) => [b.leadId, b.projectId]))

  const surveyInvites: SurveyInvite[] = []
  const surveyResponses: SurveyResponse[] = []

  /**
   * The unresolved ticket that best explains a detractor score.
   *
   * This is the Service Resolution → Detractor Recovery chain: the platform
   * already flagged the SLA risk, and this is where it finds out whether
   * advocacy actually broke.
   */
  function precedingTicket(leadId: string, respondedAt: string) {
    const list = ticketsByLead.get(leadId)
    if (!list) return undefined
    return list.find(
      (t) => t.status !== 'resolved' && t.openedAt <= respondedAt,
    )
  }

  /* ---- 1. Authored hero cohort ---- */

  const authoredLeadIds = new Set<string>()
  let seq = 0

  FEATURED_INVITES.forEach((invite) => {
    const lead = leadsById.get(invite.leadId)
    if (!lead) return
    authoredLeadIds.add(lead.id)
    surveyInvites.push({
      ...invite,
      id: `inv-f${seq++}`,
      customerName: lead.name,
      journeyStage: lead.stage,
    })
  })

  FEATURED_RESPONSES.forEach((response, i) => {
    const lead = leadsById.get(response.leadId)
    if (!lead) return
    authoredLeadIds.add(lead.id)

    const inviteId = `inv-fr${i}`
    surveyInvites.push({
      id: inviteId,
      leadId: lead.id,
      customerName: lead.name,
      touchpoint: response.touchpoint,
      journeyStage: lead.stage,
      channel: response.channel,
      sentAt: isoDaysBefore(
        Math.round(
          (DEMO_NOW.getTime() - new Date(response.respondedAt).getTime()) /
            86_400_000,
        ) + 2,
      ),
      respondedAt: response.respondedAt,
      status: 'responded',
      responsePropensity: 74,
      fatigueScore: 0,
      recommendedWindow: '-',
      eligible: true,
      signals: ['Authored demo record'],
      featured: true,
    })

    surveyResponses.push({
      ...response,
      id: `res-f${i}`,
      inviteId,
      customerName: lead.name,
      journeyStage: lead.stage,
      projectName: PROJECT_NAME[response.projectId] ?? 'Meridian',
      npsBand: npsBandFor(response.npsScore),
      sourceTicketId:
        response.sourceTicketId ??
        precedingTicket(lead.id, response.respondedAt)?.id,
    })
  })

  /* ---- 2. Generated volume ---- */

  for (const lead of leads) {
    if (authoredLeadIds.has(lead.id)) continue

    const touchpoints = touchpointsFor(
      lead,
      visitedLeadIds.has(lead.id),
      bookedLeadIds.has(lead.id),
      ticketsByLead.has(lead.id),
    )
    if (touchpoints.length === 0) continue

    // Fatigue is a property of the customer, not of any one invite.
    const fatigue = rng.chance(0.12) ? rng.int(2, 4) : rng.int(0, 1)

    touchpoints.forEach((touchpoint, tIdx) => {
      const id = `inv-${lead.id}-${tIdx}`
      const propensity = propensityFor(rng, lead, fatigue)
      const channel = rng.pick(CHANNELS)
      // Spans the full six-month trend window. At 120 days the two earliest
      // buckets held no responses and the chart opened on a flat zero line,
      // which reads as broken data rather than as a young feedback programme.
      const daysAgo = rng.int(2, 178)

      // Restraint first: fatigue or DND means the invite is never sent.
      if (fatigue >= 3 || lead.dnd) {
        surveyInvites.push({
          id,
          leadId: lead.id,
          customerName: lead.name,
          touchpoint,
          journeyStage: lead.stage,
          channel,
          status: 'suppressed',
          responsePropensity: propensity,
          fatigueScore: fatigue,
          recommendedWindow: '-',
          eligible: false,
          suppressedReason: lead.dnd
            ? 'Customer is marked Do Not Contact. Outreach suppressed regardless of predicted response.'
            : `${fatigue} surveys already sent in the trailing 90 days. A further invite risks fatigue.`,
          signals: signalsFor(lead, touchpoint, fatigue),
        })
        return
      }

      // A slice stays queued so the optimiser has a live queue to work.
      if (rng.chance(0.08)) {
        surveyInvites.push({
          id,
          leadId: lead.id,
          customerName: lead.name,
          touchpoint,
          journeyStage: lead.stage,
          channel,
          status: 'queued',
          responsePropensity: propensity,
          fatigueScore: fatigue,
          recommendedWindow: rng.pick(WINDOWS),
          eligible: true,
          signals: signalsFor(lead, touchpoint, fatigue),
        })
        return
      }

      const sentAt = isoDaysBefore(daysAgo)
      const responded = rng.chance(RESPONSE_RATE)

      if (!responded) {
        surveyInvites.push({
          id,
          leadId: lead.id,
          customerName: lead.name,
          touchpoint,
          journeyStage: lead.stage,
          channel,
          sentAt,
          status: rng.chance(0.45) ? 'abandoned' : 'expired',
          responsePropensity: propensity,
          fatigueScore: fatigue,
          recommendedWindow: rng.pick(WINDOWS),
          eligible: true,
          signals: signalsFor(lead, touchpoint, fatigue),
        })
        return
      }

      const respondedAt = isoDaysBefore(Math.max(0, daysAgo - rng.int(1, 3)))
      const sentiment = sentimentFor(rng, touchpoint)
      const npsScore = npsFor(rng, sentiment)
      const projectId =
        projectByLead.get(lead.id) ??
        lead.interestedProjectIds[0] ??
        PROJECTS[0].id

      surveyInvites.push({
        id,
        leadId: lead.id,
        customerName: lead.name,
        touchpoint,
        journeyStage: lead.stage,
        channel,
        sentAt,
        respondedAt,
        status: 'responded',
        responsePropensity: propensity,
        fatigueScore: fatigue,
        recommendedWindow: rng.pick(WINDOWS),
        eligible: true,
        signals: signalsFor(lead, touchpoint, fatigue),
      })

      surveyResponses.push({
        id: `res-${lead.id}-${tIdx}`,
        inviteId: id,
        leadId: lead.id,
        customerName: lead.name,
        touchpoint,
        projectId,
        projectName: PROJECT_NAME[projectId] ?? 'Meridian',
        journeyStage: lead.stage,
        npsScore,
        npsBand: npsBandFor(npsScore),
        csatScore: csatFor(rng, sentiment),
        verbatim: rng.pick(VERBATIM_POOLS[touchpoint][sentiment]),
        sentiment,
        channel,
        respondedAt,
        sourceTicketId: precedingTicket(lead.id, respondedAt)?.id,
      })
    })
  }

  /* ---- 3. Recovery cases ---- */

  const recoveryCases = buildRecoveryCases(rng, surveyResponses, leadsById)

  return { surveyInvites, surveyResponses, recoveryCases }
}

/**
 * Seeded recovery history.
 *
 * Enough closed cases to make the SLA view and closure discipline meaningful,
 * and a live open queue. New cases are created by the Recovery Copilot during
 * the demo — after human review — rather than appearing here.
 */
function buildRecoveryCases(
  rng: Rng,
  responses: SurveyResponse[],
  leadsById: Map<string, Lead>,
): RecoveryCase[] {
  const detractors = responses
    .filter((r) => r.npsBand === 'detractor')
    // Worst score first, then the ones with a ticket already breaching.
    .sort((a, b) => {
      if (a.npsScore !== b.npsScore) return a.npsScore - b.npsScore
      return (b.sourceTicketId ? 1 : 0) - (a.sourceTicketId ? 1 : 0)
    })
    .slice(0, 96)

  return detractors.map((response, i) => {
    const lead = leadsById.get(response.leadId)
    const ownerId = lead?.ownerId ?? REPS[0].id
    const ownerName = REPS.find((r) => r.id === ownerId)?.name ?? 'Customer Care'
    const slaDays = response.npsScore <= 2 ? 2 : 5
    const severity: Severity =
      response.npsScore <= 2
        ? 'critical'
        : response.npsScore <= 4
          ? 'high'
          : 'medium'

    /*
     * Status is drawn first and the dates are then made consistent with it.
     * Deriving status from the dates instead pushed almost everything into
     * "escalated", which reads as a broken queue rather than a managed one —
     * the SLA view needs a healthy majority for a breach to mean anything.
     */
    const roll = rng.float()
    const status: RecoveryCase['status'] =
      roll < 0.55
        ? 'closed'
        : roll < 0.79
          ? 'open'
          : roll < 0.92
            ? 'in-progress'
            : 'escalated'

    // Escalated cases are past SLA by construction; the rest are still inside it.
    const openedDaysAgo =
      status === 'escalated'
        ? slaDays + rng.int(2, 14)
        : status === 'closed'
          ? rng.int(slaDays, 45)
          : rng.int(0, slaDays)

    const closedDaysAgo =
      status === 'closed' ? Math.max(0, openedDaysAgo - rng.int(1, slaDays)) : 0

    const timeline = [
      {
        at: isoDaysBefore(openedDaysAgo),
        actor: 'DICE',
        note: `Detractor score ${response.npsScore}/10 detected on the ${response.touchpoint} survey.`,
      },
    ]
    if (status !== 'open') {
      timeline.push({
        at: isoDaysBefore(Math.max(0, openedDaysAgo - 1)),
        actor: ownerName,
        note: 'Case acknowledged and customer contacted.',
      })
    }
    if (status === 'escalated') {
      timeline.push({
        at: isoDaysBefore(Math.max(0, openedDaysAgo - slaDays)),
        actor: 'Customer Care lead',
        note: 'SLA breached with no confirmed resolution. Escalated.',
      })
    }
    if (status === 'closed') {
      timeline.push({
        at: isoDaysBefore(closedDaysAgo),
        actor: ownerName,
        note: 'Resolution confirmed with the customer and case closed.',
      })
    }

    return {
      id: `rec-${i.toString().padStart(4, '0')}`,
      responseId: response.id,
      leadId: response.leadId,
      customerName: response.customerName,
      severity,
      themeId: dominantThemeId(response.verbatim),
      ownerId,
      openedAt: isoDaysBefore(openedDaysAgo),
      slaDueAt: isoDaysBefore(openedDaysAgo - slaDays),
      closedAt: status === 'closed' ? isoDaysBefore(closedDaysAgo) : undefined,
      status,
      recommendedResponse:
        'Acknowledge the delay, name a single owner, and commit to a dated next step in writing.',
      escalationPath: [ownerName, 'Customer Care lead', 'Head of CX'],
      timeline,
      closureEvidence:
        status === 'closed'
          ? 'Customer confirmed resolution on the follow-up call.'
          : undefined,
      sourceTicketId: response.sourceTicketId,
    }
  })
}

/**
 * The theme with the most keyword hits in a verbatim.
 *
 * Same matcher the analyser uses, so a case and the theme it is filed under
 * never disagree — a mismatch between the two is exactly the kind of thing a
 * client notices on stage.
 */
function dominantThemeId(verbatim: string) {
  const text = verbatim.toLowerCase()
  let bestId = THEME_DEFS[0].id
  let bestHits = 0
  for (const def of THEME_DEFS) {
    const hits = def.keywords.filter((k) => text.includes(k)).length
    if (hits > bestHits) {
      bestHits = hits
      bestId = def.id
    }
  }
  return bestHits > 0 ? bestId : ''
}
