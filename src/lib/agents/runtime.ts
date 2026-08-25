import { salesforceCrm } from '@/lib/crm'
import { DEMO_NOW } from '@/data/reference'
import type {
  Agent,
  AgentActionPlan,
  AgentContext,
  AgentRunResult,
  CrmWrite,
} from './types'

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
