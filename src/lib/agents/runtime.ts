import { salesforceCrm } from '@/lib/crm'
import { DEMO_NOW } from '@/data/reference'
import type {
  Agent,
  AgentActionPlan,
  AgentContext,
  AgentFinding,
  AgentRunResult,
  CrmWrite,
} from './types'
import { AGENTS_BY_ID } from './registry'
import { CHAINS_BY_ID, type ChainStepResult } from './chains'

/**
 * Runs an agent end to end: detect → recommend → (optionally) execute.
 *
 * Execution is deliberately a separate step, so the gallery can show what the
 * agent intends to write before anything touches the CRM.
 */
export async function runAgent(
  agent: Agent,
  ctx: AgentContext,
): Promise<AgentRunResult> {
  const findings = await agent.detect(ctx)
  const actions = await agent.recommendAction(findings, ctx)

  const summary = findings.length
    ? (
        await ctx.ai.complete({
          system: 'You are a real-estate CRM analyst summarising an agent run.',
          messages: [
            {
              role: 'user',
              content: `${agent.name} found ${findings.length} issue(s). Top finding: ${findings[0].headline}. ${findings[0].detail}`,
            },
          ],
          context: { agentId: agent.id },
        })
      ).text
    : 'No matching records in the current book — nothing to action.'

  return {
    agentId: agent.id,
    findings,
    actions,
    summary,
    totalFindings: findings.length,
    ranAt: DEMO_NOW.toISOString(),
  }
}

/**
 * Commits one CRM write through the Salesforce facade and returns a
 * human-readable record of what landed.
 */
export function executeWrite(write: CrmWrite): string {
  switch (write.kind) {
    case 'flag-lead': {
      const lead = salesforceCrm.getLead(write.leadId)
      salesforceCrm.flagLead(write.leadId, write.flags, write.reason)
      const fields = Object.keys(write.flags).join(', ')
      return `Lead ${lead?.name ?? write.leadId}: updated ${fields}`
    }

    case 'update-lead': {
      salesforceCrm.updateLead(write.leadId, write.patch, {
        action: write.action,
        detail: write.detail,
      })
      return `Lead ${write.leadId}: ${write.action}`
    }

    case 'create-task': {
      const task = salesforceCrm.createTask({
        subject: write.subject,
        whatId: write.leadId,
        ownerId: write.ownerId,
        dueInDays: write.dueInDays,
        priority: write.priority,
        createdBy: 'DICE',
      })
      return `Task ${task.id} created: ${task.subject}`
    }

    case 'log-activity': {
      salesforceCrm.logActivity({
        object: write.object,
        recordId: write.recordId,
        recordName: write.recordName,
        action: write.action,
        detail: write.detail,
        source: 'DICE',
      })
      return `${write.object} ${write.recordName}: ${write.action}`
    }

    case 'suppress-campaign': {
      salesforceCrm.suppressCampaign(write.campaignId, write.reason)
      return `Campaign ${write.campaignId}: outreach suppressed`
    }

    case 'ingest-sanitized': {
      salesforceCrm.ingestSanitizedData(write.leadIds)
      return `${write.leadIds.length} record(s) ingested via EAI`
    }

    case 'schedule-survey': {
      salesforceCrm.scheduleSurveyInvite(write.inviteId, write.reason)
      return `Survey invite ${write.inviteId} scheduled`
    }

    case 'suppress-survey': {
      salesforceCrm.suppressSurveyInvite(write.inviteId, write.reason)
      return `Survey invite ${write.inviteId} suppressed — ${write.reason}`
    }

    case 'create-recovery-case': {
      const recoveryCase = salesforceCrm.createRecoveryCase({
        responseId: write.responseId,
        leadId: write.leadId,
        ownerId: write.ownerId,
        severity: write.severity,
        themeId: write.themeId,
        slaDays: write.slaDays,
        recommendedResponse: write.recommendedResponse,
        sourceTicketId: write.sourceTicketId,
      })
      return `Recovery case ${recoveryCase.id} opened for ${recoveryCase.customerName}`
    }

    case 'tag-feedback': {
      salesforceCrm.logActivity({
        object: 'Activity',
        recordId: write.responseId,
        recordName: write.recordName,
        action: `Feedback tagged ${write.tag}`,
        detail: write.reason,
        source: 'DICE',
      })
      return `${write.recordName}: tagged ${write.tag}`
    }
  }
}

export function executeAction(action: AgentActionPlan): string {
  return executeWrite(action.write)
}

/* ---------- Chained runs ---------- */

export interface ChainRunResult {
  chainId: string
  leadId: string
  steps: ChainStepResult[]
  /** Every plan the chain produced, deduplicated. */
  plans: AgentActionPlan[]
  /** How many steps actually rested on an earlier agent's conclusion. */
  handoffs: number
}

/**
 * Runs a declared chain for one customer.
 *
 * Each step sees what earlier steps concluded through `ctx.priorFindings`, so
 * a later agent can cite a conclusion instead of re-deriving it from raw
 * records. Findings are filtered to this lead first — a chain is about one
 * customer, and passing the whole book forward would let an agent cite a
 * finding about somebody else.
 *
 * Nothing is written. The chain proposes; the human commits, exactly as a solo
 * agent run does.
 */
export async function runChain(
  chainId: string,
  leadId: string,
  ctx: AgentContext,
  /**
   * Run every agent blind to the others, as the gallery does.
   *
   * This has to be a real mode rather than a display filter. Blanking
   * priorFindings on the context does nothing — runChain replaces it per step
   * with its own accumulator — so hiding the citation line while leaving the
   * evidence untouched would fake the comparison the toggle exists to prove.
   */
  opts: { isolated?: boolean } = {},
): Promise<ChainRunResult> {
  const chain = CHAINS_BY_ID[chainId]
  if (!chain) throw new Error(`Unknown chain: ${chainId}`)

  const steps: ChainStepResult[] = []
  const plans: AgentActionPlan[] = []
  const pooled: AgentFinding[] = []
  let handoffs = 0

  /*
   * Narrow the book to this customer before running anything.
   *
   * Agents rank the whole book and cap their output, so running them globally
   * and filtering afterwards silently drops the customer whenever they are not
   * in that agent's worst-N. Two agents can both have something to say about a
   * customer and still never overlap. Scoping the context first makes each
   * agent evaluate the customer in front of it, which is what a per-customer
   * chain actually means — and it needs no change to any agent.
   */
  const scoped = scopeToLead(ctx, leadId)

  for (const step of chain.steps) {
    const agent = AGENTS_BY_ID[step.agentId]
    if (!agent) continue

    const stepCtx: AgentContext = {
      ...scoped,
      priorFindings: opts.isolated ? [] : [...pooled],
    }
    const found = agent
      .detectSync(stepCtx)
      .filter((f) => f.leadId === leadId)

    if (!found.length) {
      steps.push({
        agentId: agent.id,
        agentName: agent.name,
        role: step.role,
        status: 'nothing-to-add',
        findings: [],
      })
      continue
    }

    // Resolve the citation for display, if this agent took one.
    const citing = found.find((f) => f.citesFindingId)
    const source = citing
      ? pooled.find((f) => f.id === citing.citesFindingId)
      : undefined
    if (source) handoffs += 1

    steps.push({
      agentId: agent.id,
      agentName: agent.name,
      role: step.role,
      status: 'concluded',
      findings: found,
      cited: source
        ? {
            agentName: AGENTS_BY_ID[source.agentId ?? '']?.name ?? 'Earlier step',
            headline: source.headline,
            evidence: source.evidence,
          }
        : undefined,
    })

    pooled.push(...found)
    plans.push(...(await agent.recommendAction(found, stepCtx)))
  }

  return { chainId, leadId, steps, plans: dedupePlans(plans), handoffs }
}

/**
 * Collapses plans that would make the same write.
 *
 * Two agents reaching the same conclusion is a signal, not a reason to write
 * twice. Keyed on the write itself rather than on the agent, so the duplicate
 * is caught however it was arrived at.
 */
function dedupePlans(plans: AgentActionPlan[]): AgentActionPlan[] {
  const seen = new Map<string, AgentActionPlan>()
  for (const p of plans) {
    const key = `${p.write.kind}::${p.leadId ?? ''}::${p.label}`
    if (!seen.has(key)) seen.set(key, p)
  }
  return [...seen.values()]
}

/**
 * The book as it concerns one customer.
 *
 * Everything keyed by lead is filtered; reference data the agents need for
 * context (campaigns, reps) is left whole. Survey responses drive the recovery
 * and feedback agents, so those are narrowed by lead too.
 */
function scopeToLead(ctx: AgentContext, leadId: string): AgentContext {
  const responseIds = new Set(
    ctx.surveyResponses.filter((r) => r.leadId === leadId).map((r) => r.id),
  )
  return {
    ...ctx,
    leads: ctx.leads.filter((l) => l.id === leadId),
    engagements: ctx.engagements.filter((e) => e.leadId === leadId),
    siteVisits: ctx.siteVisits.filter((v) => v.leadId === leadId),
    bookings: ctx.bookings.filter((b) => b.leadId === leadId),
    payments: ctx.payments.filter((p) => p.leadId === leadId),
    serviceTickets: ctx.serviceTickets.filter((t) => t.leadId === leadId),
    // A task points at its record through whatId, not a leadId.
    tasks: ctx.tasks.filter((t) => t.whatId === leadId),
    surveyInvites: ctx.surveyInvites.filter((i) => i.leadId === leadId),
    surveyResponses: ctx.surveyResponses.filter((r) => r.leadId === leadId),
    recoveryCases: ctx.recoveryCases.filter((c) => c.leadId === leadId),
    feedbackThemes: ctx.feedbackThemes.filter((t) =>
      t.responseIds.some((id) => responseIds.has(id)),
    ),
  }
}

/**
 * Customers this chain actually has something to say about, best first.
 *
 * A chain is only worth showing on a customer whose records trigger several of
 * its steps, and that cannot be guessed — it has to be measured against the
 * book. Scoring candidates here means the picker offers customers where the
 * chain genuinely fires instead of leaving the viewer to hunt for one.
 *
 * Cheap because detectSync is a pure rule pass with no AI call.
 */
export function candidatesForChain(
  chainId: string,
  ctx: AgentContext,
  limit = 6,
): { leadId: string; name: string; steps: number; handoffs: number }[] {
  const chain = CHAINS_BY_ID[chainId]
  if (!chain) return []

  // Leads any step of this chain flags across the whole book.
  const seen = new Set<string>()
  for (const step of chain.steps) {
    const agent = AGENTS_BY_ID[step.agentId]
    if (!agent) continue
    for (const f of agent.detectSync(ctx)) if (f.leadId) seen.add(f.leadId)
  }

  const scored: {
    leadId: string
    name: string
    steps: number
    handoffs: number
  }[] = []

  for (const leadId of seen) {
    const scoped = scopeToLead(ctx, leadId)
    const pooled: AgentFinding[] = []
    let hits = 0
    let handoffs = 0

    /*
     * Replay the chain with detectSync only — no AI call, no plans — so this
     * stays cheap enough to score every candidate. Counting handoffs rather
     * than steps is the point: a customer where four agents each speak but none
     * cites another demonstrates nothing, and that is exactly what ranking by
     * step count alone kept surfacing.
     */
    for (const step of chain.steps) {
      const agent = AGENTS_BY_ID[step.agentId]
      if (!agent) continue
      const found = agent
        .detectSync({ ...scoped, priorFindings: [...pooled] })
        .filter((f) => f.leadId === leadId)
      if (!found.length) continue
      hits += 1
      if (found.some((f) => f.citesFindingId && pooled.some((p) => p.id === f.citesFindingId))) {
        handoffs += 1
      }
      pooled.push(...found)
    }

    if (hits > 1) {
      scored.push({
        leadId,
        name: ctx.leads.find((l) => l.id === leadId)?.name ?? leadId,
        steps: hits,
        handoffs,
      })
    }
  }

  // A visible handoff outranks a longer chain that never passes anything.
  return scored
    .sort((a, b) => b.handoffs - a.handoffs || b.steps - a.steps)
    .slice(0, limit)
}
