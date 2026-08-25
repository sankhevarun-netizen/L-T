import { THEME_DEFS, THEME_DEFS_BY_ID } from '@/data/feedback'
import { DEMO_NOW } from '@/data/reference'
import type {
  FeedbackTheme,
  Intervention,
  JourneyStage,
  NpsBand,
  RecoveryCase,
  RootCauseCluster,
  Sentiment,
  SurveyInvite,
  SurveyResponse,
  TouchpointId,
} from '@/types'
import { TOUCHPOINT_LABEL, TOUCHPOINT_ORDER } from '@/types'

/**
 * Feedback selectors.
 *
 * Pure functions over arrays, same contract as selectors/overview.ts. Theme
 * extraction and clustering are deterministic rule passes — the AI service
 * layers narrative on top, exactly as the agent registry does. A live demo
 * cannot afford the analysis to come out differently on the second run.
 *
 * Everything here that scores, predicts or correlates is illustrative until
 * validated against client data, and the UI must say so.
 */

/* ------------------------------------------------------------------ */
/* Type 1 — descriptive reporting                                      */
/* ------------------------------------------------------------------ */

export interface NpsSummary {
  responses: number
  promoters: number
  passives: number
  detractors: number
  promoterPct: number
  passivePct: number
  detractorPct: number
  /** Standard NPS: %promoters − %detractors, rounded to a whole number. */
  nps: number
}

export function selectNpsSummary(responses: SurveyResponse[]): NpsSummary {
  const total = responses.length
  const promoters = responses.filter((r) => r.npsBand === 'promoter').length
  const passives = responses.filter((r) => r.npsBand === 'passive').length
  const detractors = responses.filter((r) => r.npsBand === 'detractor').length

  const pct = (n: number) => (total ? (n / total) * 100 : 0)
  const promoterPct = pct(promoters)
  const detractorPct = pct(detractors)

  return {
    responses: total,
    promoters,
    passives,
    detractors,
    promoterPct: Math.round(promoterPct * 10) / 10,
    passivePct: Math.round(pct(passives) * 10) / 10,
    detractorPct: Math.round(detractorPct * 10) / 10,
    nps: Math.round(promoterPct - detractorPct),
  }
}

export interface NpsTrendPoint {
  month: string
  nps: number
  responses: number
}

/** Trailing six months of NPS, bucketed by response month. */
export function selectNpsTrend(responses: SurveyResponse[]): NpsTrendPoint[] {
  const buckets = new Map<string, SurveyResponse[]>()

  // Anchored to the first of the month: subtracting a month from the 31st
  // lands on a day that does not exist and silently rolls into the next month,
  // which dropped February entirely and produced March twice.
  for (let i = 5; i >= 0; i--) {
    const d = new Date(
      Date.UTC(DEMO_NOW.getUTCFullYear(), DEMO_NOW.getUTCMonth() - i, 1),
    )
    buckets.set(monthKey(d), [])
  }

  for (const response of responses) {
    const key = monthKey(new Date(response.respondedAt))
    buckets.get(key)?.push(response)
  }

  return [...buckets.entries()].map(([month, rows]) => ({
    month,
    nps: rows.length ? selectNpsSummary(rows).nps : 0,
    responses: rows.length,
  }))
}

function monthKey(d: Date) {
  return `${d.toLocaleDateString('en-GB', { month: 'short' })}'${String(
    d.getFullYear(),
  ).slice(2)}`
}

export interface TouchpointCsat {
  touchpoint: TouchpointId
  label: string
  /** Mean of the 1–5 CSAT scores. */
  csat: number
  /** Share scoring 4 or 5, the conventional "satisfied" cut. */
  satisfiedPct: number
  responses: number
  nps: number
}

export function selectCsatByTouchpoint(
  responses: SurveyResponse[],
): TouchpointCsat[] {
  return TOUCHPOINT_ORDER.map((touchpoint) => {
    const rows = responses.filter((r) => r.touchpoint === touchpoint)
    const sum = rows.reduce((s, r) => s + r.csatScore, 0)
    const satisfied = rows.filter((r) => r.csatScore >= 4).length

    return {
      touchpoint,
      label: TOUCHPOINT_LABEL[touchpoint],
      csat: rows.length ? Math.round((sum / rows.length) * 100) / 100 : 0,
      satisfiedPct: rows.length
        ? Math.round((satisfied / rows.length) * 1000) / 10
        : 0,
      responses: rows.length,
      nps: rows.length ? selectNpsSummary(rows).nps : 0,
    }
  }).filter((row) => row.responses > 0)
}

export interface SentimentBreakdown {
  positive: number
  neutral: number
  negative: number
  total: number
  /** Frequency of each theme label, for the Type 1 theme-count chart. */
  themeCounts: { label: string; count: number }[]
}

export function selectSentimentBreakdown(
  responses: SurveyResponse[],
): SentimentBreakdown {
  const count = (s: Sentiment) =>
    responses.filter((r) => r.sentiment === s).length

  const counts = new Map<string, number>()
  for (const response of responses) {
    for (const def of matchThemes(response.verbatim)) {
      counts.set(def.id, (counts.get(def.id) ?? 0) + 1)
    }
  }

  return {
    positive: count('positive'),
    neutral: count('neutral'),
    negative: count('negative'),
    total: responses.length,
    themeCounts: [...counts.entries()]
      .map(([id, n]) => ({ label: THEME_DEFS_BY_ID[id]?.label ?? id, count: n }))
      .sort((a, b) => b.count - a.count),
  }
}

/* ------------------------------------------------------------------ */
/* Type 2 — voice of customer                                          */
/* ------------------------------------------------------------------ */

/** Every theme whose keywords appear in the text and are not vetoed. */
function matchThemes(verbatim: string) {
  const text = verbatim.toLowerCase()
  return THEME_DEFS.filter((def) => {
    if (def.excludes?.some((phrase) => text.includes(phrase))) return false
    return def.keywords.some((keyword) => text.includes(keyword))
  })
}

/**
 * The span of the verbatim that triggered a theme.
 *
 * Returns the sentence containing the keyword rather than the keyword alone —
 * a bare keyword is not evidence a human can check, and the guardrail requires
 * traceability back to the customer's own words.
 */
function evidenceSpan(verbatim: string, keywords: string[]) {
  const sentences = verbatim.split(/(?<=[.!?])\s+/)
  // The sentence with the most keyword hits, not merely the first to match.
  // Taking the first put the same shared sentence against two different themes
  // when a later sentence spoke to one of them far more directly.
  let best = ''
  let bestHits = 0
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase()
    const hits = keywords.filter((keyword) => lower.includes(keyword)).length
    if (hits > bestHits) {
      bestHits = hits
      best = sentence
    }
  }
  return (bestHits > 0 ? best : verbatim).trim()
}

/**
 * Confidence in a theme assignment.
 *
 * Volume is most of it — three mentions is a hint, eighty is a pattern — with a
 * bonus when several distinct keywords for the same theme fire together.
 * Capped below 100 because a rule pass is never certain.
 */
function confidenceFor(mentions: number, keywordBreadth: number) {
  // Tuned so a handful of mentions lands near 45 and a thousand near 90. An
  // earlier curve saturated by ~14 mentions, which reported 94% confidence on
  // the emerging theme the indicator exists to qualify.
  const volume = Math.min(50, Math.log2(mentions + 1) * 6)
  const breadth = Math.min(20, keywordBreadth * 5)
  return Math.max(30, Math.min(92, Math.round(20 + volume + breadth)))
}

export function selectThemes(responses: SurveyResponse[]): FeedbackTheme[] {
  const acc = new Map<
    string,
    { responseIds: string[]; evidence: string[]; keywords: Set<string> }
  >()

  for (const response of responses) {
    const text = response.verbatim.toLowerCase()
    for (const def of matchThemes(response.verbatim)) {
      const entry = acc.get(def.id) ?? {
        responseIds: [],
        evidence: [],
        keywords: new Set<string>(),
      }
      entry.responseIds.push(response.id)
      // Authored records lead the evidence list so the hero verbatim is the
      // first thing a presenter sees when they open a theme.
      const span = evidenceSpan(response.verbatim, def.keywords)
      if (entry.evidence.length < 6 && !entry.evidence.includes(span)) {
        if (response.featured) entry.evidence.unshift(span)
        else entry.evidence.push(span)
      }
      for (const keyword of def.keywords) {
        if (text.includes(keyword)) entry.keywords.add(keyword)
      }
      acc.set(def.id, entry)
    }
  }

  const responsesById = new Map(responses.map((r) => [r.id, r]))

  return [...acc.entries()]
    .map(([id, entry]) => {
      const def = THEME_DEFS_BY_ID[id]
      const rows = entry.responseIds
        .map((rid) => responsesById.get(rid))
        .filter((r): r is SurveyResponse => Boolean(r))
      const negative = rows.filter((r) => r.sentiment === 'negative').length
      const positive = rows.filter((r) => r.sentiment === 'positive').length

      const sentiment: Sentiment =
        negative > positive
          ? 'negative'
          : positive > negative
            ? 'positive'
            : 'neutral'

      return {
        id,
        label: def.label,
        parentId: def.parentId,
        aspect: def.aspect,
        sentiment,
        confidence: confidenceFor(entry.responseIds.length, entry.keywords.size),
        mentions: entry.responseIds.length,
        responseIds: entry.responseIds,
        evidence: entry.evidence,
        // Flagged in the taxonomy and genuinely low-volume. Both must hold, or
        // the confidence indicator is decorative.
        emerging: Boolean(def.emerging) && entry.responseIds.length <= 40,
        suggestedCrmTag: def.suggestedCrmTag,
      }
    })
    .sort((a, b) => b.mentions - a.mentions)
}

/**
 * The themes present in one response, carrying *that response's* evidence.
 *
 * The theme-level `evidence` array is drawn from the whole book, so rendering it
 * on a single record shows another customer's words next to this customer's
 * score. Drilling in from a record must quote the record.
 */
export function selectThemesForResponse(
  response: SurveyResponse,
  themes: FeedbackTheme[],
): FeedbackTheme[] {
  const defsById = Object.fromEntries(THEME_DEFS.map((d) => [d.id, d]))
  return themes
    .filter((theme) => theme.responseIds.includes(response.id))
    .map((theme) => ({
      ...theme,
      evidence: [evidenceSpan(response.verbatim, defsById[theme.id]?.keywords ?? [])],
    }))
}

/* ------------------------------------------------------------------ */
/* Root cause                                                          */
/* ------------------------------------------------------------------ */

/**
 * Groups themes into clusters against the journey stage they concentrate in.
 *
 * `correlation` is the strength of association between the theme appearing and
 * the response being a detractor. It is a diagnostic signal requiring business
 * validation — never a causal claim, and the UI copy must not imply one.
 */
/**
 * Volume floors.
 *
 * Six mentions is an anecdote. Without a floor a six-response theme surfaced as
 * the second-worst driver in the book, which is the kind of thing a client
 * checks and loses confidence over.
 */
const MIN_CLUSTER_RESPONSES = 10
const MIN_DRIVER_MENTIONS = 25

export function selectRootCauseClusters(
  responses: SurveyResponse[],
  themes: FeedbackTheme[],
): RootCauseCluster[] {
  const responsesById = new Map(responses.map((r) => [r.id, r]))
  const bookMeanNps = responses.length
    ? responses.reduce((s, r) => s + r.npsScore, 0) / responses.length
    : 0
  const bookDetractorRate = responses.length
    ? responses.filter((r) => r.npsBand === 'detractor').length / responses.length
    : 0

  return themes
    .map((theme) => {
      const rows = theme.responseIds
        .map((id) => responsesById.get(id))
        .filter((r): r is SurveyResponse => Boolean(r))

      /*
       * A cluster is built from the complaints about an aspect, not from the
       * aspect's overall mood. Filtering on the theme's majority sentiment hid
       * Documentation entirely — most people who mention paperwork are content,
       * yet the third who are not is precisely the operational problem.
       */
      const negative = rows.filter((r) => r.sentiment === 'negative')
      if (negative.length < MIN_CLUSTER_RESPONSES) return null

      const meanNps = negative.reduce((s, r) => s + r.npsScore, 0) / negative.length

      // Correlation is measured across everyone who raised the aspect, so a
      // common topic is not flattered by looking only at its complaints.
      const themeDetractorRate = rows.length
        ? rows.filter((r) => r.npsBand === 'detractor').length / rows.length
        : 0
      const correlation =
        Math.round(
          Math.max(-1, Math.min(1, themeDetractorRate - bookDetractorRate)) * 100,
        ) / 100

      const featured = negative.filter((r) => r.featured)
      const evidenceRows = [...featured, ...negative.filter((r) => !r.featured)]

      return {
        id: `cls-${theme.id}`,
        label: theme.label,
        themeIds: [theme.id],
        journeyStage: modeOf(negative.map((r) => r.journeyStage)) ?? 'engaged',
        touchpoint: modeOf(negative.map((r) => r.touchpoint)) ?? 'sales',
        projectIds: [...new Set(negative.map((r) => r.projectId))],
        repeatCount: negative.length,
        correlation,
        affectedResponses: negative.length,
        npsDrag: Math.round((meanNps - bookMeanNps) * 10) / 10,
        evidence: evidenceRows.slice(0, 3).map((r) => r.verbatim),
      }
    })
    .filter((c): c is RootCauseCluster => c !== null)
    .sort((a, b) => a.npsDrag - b.npsDrag)
}

function modeOf<T extends string>(values: T[]): T | undefined {
  if (!values.length) return undefined
  const counts = new Map<T, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

export interface JourneyHeatCell {
  stage: JourneyStage
  touchpoint: TouchpointId
  responses: number
  nps: number
  detractorPct: number
}

/** Journey stage × touchpoint grid backing the root-cause heatmap. */
export function selectJourneyHeatmap(
  responses: SurveyResponse[],
): JourneyHeatCell[] {
  const cells = new Map<string, SurveyResponse[]>()
  for (const response of responses) {
    const key = `${response.journeyStage}::${response.touchpoint}`
    const list = cells.get(key)
    if (list) list.push(response)
    else cells.set(key, [response])
  }

  return [...cells.entries()].map(([key, rows]) => {
    const [stage, touchpoint] = key.split('::') as [JourneyStage, TouchpointId]
    const detractors = rows.filter((r) => r.npsBand === 'detractor').length
    return {
      stage,
      touchpoint,
      responses: rows.length,
      nps: selectNpsSummary(rows).nps,
      detractorPct: Math.round((detractors / rows.length) * 1000) / 10,
    }
  })
}

/* ------------------------------------------------------------------ */
/* Participation                                                       */
/* ------------------------------------------------------------------ */

export interface SurveyQueueRow {
  invite: SurveyInvite
  /** Propensity banded for the queue's colour coding. */
  band: 'high' | 'medium' | 'low'
}

function bandFor(propensity: number): SurveyQueueRow['band'] {
  if (propensity >= 70) return 'high'
  if (propensity >= 45) return 'medium'
  return 'low'
}

/**
 * The queue the optimiser works: what to send next, best first.
 *
 * Suppressed invites are returned separately rather than filtered away. An
 * optimiser that only shows what it would send looks like a mailing list; the
 * restraint is half the argument.
 */
export function selectSurveyQueue(invites: SurveyInvite[]) {
  const queued = invites
    .filter((i) => i.status === 'queued' && i.eligible)
    .sort((a, b) => b.responsePropensity - a.responsePropensity)
    .map((invite) => ({ invite, band: bandFor(invite.responsePropensity) }))

  const suppressed = invites
    .filter((i) => i.status === 'suppressed')
    .sort((a, b) => b.fatigueScore - a.fatigueScore)
    .map((invite) => ({ invite, band: bandFor(invite.responsePropensity) }))

  const sent = invites.filter((i) => i.status !== 'queued' && i.status !== 'suppressed')
  const responded = sent.filter((i) => i.status === 'responded').length

  return {
    queued,
    suppressed,
    sentCount: sent.length,
    respondedCount: responded,
    responseRatePct: sent.length
      ? Math.round((responded / sent.length) * 1000) / 10
      : 0,
    /** Mean propensity of the queue — what the next send is worth. */
    queueMeanPropensity: queued.length
      ? Math.round(
          queued.reduce((s, r) => s + r.invite.responsePropensity, 0) /
            queued.length,
        )
      : 0,
  }
}

export interface PropensityCell {
  touchpoint: TouchpointId
  band: SurveyQueueRow['band']
  count: number
  meanPropensity: number
}

/** Touchpoint × propensity-band grid for the response-likelihood heatmap. */
export function selectPropensityHeatmap(
  invites: SurveyInvite[],
): PropensityCell[] {
  const out: PropensityCell[] = []
  const bands: SurveyQueueRow['band'][] = ['high', 'medium', 'low']

  for (const touchpoint of TOUCHPOINT_ORDER) {
    for (const band of bands) {
      const rows = invites.filter(
        (i) => i.touchpoint === touchpoint && bandFor(i.responsePropensity) === band,
      )
      if (!rows.length) continue
      out.push({
        touchpoint,
        band,
        count: rows.length,
        meanPropensity: Math.round(
          rows.reduce((s, i) => s + i.responsePropensity, 0) / rows.length,
        ),
      })
    }
  }
  return out
}

/* ------------------------------------------------------------------ */
/* Recovery                                                            */
/* ------------------------------------------------------------------ */

/** Negative = days until SLA, positive = days already breached. */
export function caseSlaDaysOverdue(recoveryCase: RecoveryCase) {
  return Math.round(
    (DEMO_NOW.getTime() - new Date(recoveryCase.slaDueAt).getTime()) /
      86_400_000,
  )
}

export interface RecoveryQueueRow {
  response: SurveyResponse
  existingCase?: RecoveryCase
  /** Set when an unresolved ticket preceded the detractor score. */
  hasBreachedTicket: boolean
  slaDaysOverdue?: number
}

/**
 * Detractors needing recovery, worst first.
 *
 * A response whose lead already had an unresolved ticket outranks an equal
 * score without one — the platform flagged that advocacy was at risk, and this
 * is the record showing it broke.
 */
export function selectRecoveryQueue(
  responses: SurveyResponse[],
  cases: RecoveryCase[],
): RecoveryQueueRow[] {
  const caseByResponse = new Map(cases.map((c) => [c.responseId, c]))

  return responses
    .filter((r) => r.npsBand === 'detractor')
    .map((response) => {
      const existingCase = caseByResponse.get(response.id)
      return {
        response,
        existingCase,
        hasBreachedTicket: Boolean(response.sourceTicketId),
        slaDaysOverdue: existingCase
          ? caseSlaDaysOverdue(existingCase)
          : undefined,
      }
    })
    .sort((a, b) => {
      const aOpen = a.existingCase ? 0 : 1
      const bOpen = b.existingCase ? 0 : 1
      if (aOpen !== bOpen) return bOpen - aOpen
      if (a.hasBreachedTicket !== b.hasBreachedTicket) {
        return a.hasBreachedTicket ? -1 : 1
      }
      return a.response.npsScore - b.response.npsScore
    })
}

export interface RecoverySummary {
  open: number
  inProgress: number
  escalated: number
  closed: number
  breaching: number
  closureRatePct: number
  /** Detractors with no case opened at all — the real exposure. */
  unworked: number
}

export function selectRecoverySummary(
  responses: SurveyResponse[],
  cases: RecoveryCase[],
): RecoverySummary {
  const count = (status: RecoveryCase['status']) =>
    cases.filter((c) => c.status === status).length

  const closed = count('closed')
  const detractors = responses.filter((r) => r.npsBand === 'detractor').length
  const withCase = new Set(cases.map((c) => c.responseId)).size

  return {
    open: count('open'),
    inProgress: count('in-progress'),
    escalated: count('escalated'),
    closed,
    breaching: cases.filter(
      (c) => c.status !== 'closed' && caseSlaDaysOverdue(c) > 0,
    ).length,
    closureRatePct: cases.length
      ? Math.round((closed / cases.length) * 1000) / 10
      : 0,
    unworked: Math.max(0, detractors - withCase),
  }
}

/* ------------------------------------------------------------------ */
/* Control tower                                                       */
/* ------------------------------------------------------------------ */

export interface SatisfactionDriver {
  label: string
  aspect: string
  sentiment: Sentiment
  mentions: number
  /** Mean NPS of responses carrying this theme, minus the book mean. */
  npsDelta: number
}

/** The themes moving satisfaction most, in both directions. */
export function selectDrivers(
  responses: SurveyResponse[],
  themes: FeedbackTheme[],
): { strengths: SatisfactionDriver[]; drags: SatisfactionDriver[] } {
  const responsesById = new Map(responses.map((r) => [r.id, r]))
  const bookMean = responses.length
    ? responses.reduce((s, r) => s + r.npsScore, 0) / responses.length
    : 0

  const drivers = themes
    .filter((theme) => theme.mentions >= MIN_DRIVER_MENTIONS)
    .map((theme) => {
      const rows = theme.responseIds
        .map((id) => responsesById.get(id))
        .filter((r): r is SurveyResponse => Boolean(r))
      const mean = rows.length
        ? rows.reduce((s, r) => s + r.npsScore, 0) / rows.length
        : 0

      return {
        label: theme.label,
        aspect: theme.aspect,
        sentiment: theme.sentiment,
        mentions: theme.mentions,
        npsDelta: Math.round((mean - bookMean) * 10) / 10,
      }
    })

  return {
    strengths: drivers
      .filter((d) => d.npsDelta > 0)
      .sort((a, b) => b.npsDelta - a.npsDelta)
      .slice(0, 5),
    drags: drivers
      .filter((d) => d.npsDelta < 0)
      .sort((a, b) => a.npsDelta - b.npsDelta)
      .slice(0, 5),
  }
}

/**
 * Improvement backlog derived from the clusters.
 *
 * Impact and effort are configured inputs, not model outputs — the matrix is a
 * planning aid, and presenting a prioritisation as if it were predicted would
 * overclaim exactly where the guardrails say not to.
 */
export function selectInterventions(
  clusters: RootCauseCluster[],
): Intervention[] {
  const EFFORT: Record<string, number> = {
    Documentation: 4,
    Service: 3,
    Handover: 8,
    Payment: 5,
    Quality: 9,
    Amenities: 3,
    Allotment: 2,
    Sales: 4,
  }

  const OWNER: Record<string, string> = {
    Documentation: 'Legal & Documentation',
    Service: 'Customer Care',
    Handover: 'Projects',
    Payment: 'Finance',
    Quality: 'Projects',
    Amenities: 'Facilities',
    Allotment: 'Sales Operations',
    Sales: 'Sales',
  }

  return clusters
    .map((cluster, i) => {
      const aspect = THEME_DEFS_BY_ID[cluster.themeIds[0]]?.aspect ?? 'Service'
      // Impact scales with how far the cluster drags NPS and how often it recurs.
      const impact = Math.max(
        1,
        Math.min(
          10,
          Math.round(Math.abs(cluster.npsDrag) * 2 + cluster.repeatCount / 60),
        ),
      )

      return {
        id: `int-${i.toString().padStart(3, '0')}`,
        title: `Address ${cluster.label.toLowerCase()}`,
        clusterId: cluster.id,
        impact,
        effort: EFFORT[aspect] ?? 5,
        owner: OWNER[aspect] ?? 'Customer Care',
        status:
          impact >= 7 ? 'in-flight' : impact >= 5 ? 'planned' : ('backlog' as const),
      } satisfies Intervention
    })
    .sort((a, b) => b.impact - a.impact || a.effort - b.effort)
}

/** Band counts for the Type 1 promoter/passive/detractor split chart. */
export const NPS_BAND_ORDER: NpsBand[] = ['promoter', 'passive', 'detractor']
