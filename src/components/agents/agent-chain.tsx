'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  Check,
  CircleSlash,
  CornerDownRight,
  Link2,
  Loader2,
  ShieldCheck,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InitialsAvatar } from '@/components/shared/initials-avatar'
import { CHAINS, NON_CHAINING_AGENT_IDS } from '@/lib/agents/chains'
import { AGENTS_BY_ID } from '@/lib/agents/registry'
import { candidatesForChain, runChain, type ChainRunResult } from '@/lib/agents/runtime'
import { useAgentContext } from '@/lib/agents/use-agent-context'
import { cn } from '@/lib/utils'

/**
 * Agents handing conclusions to each other, for one customer.
 *
 * The design problem here is that a trace panel will happily render whether or
 * not anything was actually passed between agents. So the proof is built in:
 * a step that had nothing to work with says so, the citation line is resolved
 * from the finding that was handed over rather than written as prose, and the
 * isolated/chained toggle lets you watch the same agent produce different
 * evidence with the chain off and on.
 *
 * Nothing is written. The chain proposes; a human commits — the same contract
 * a solo agent run follows.
 */

const KIND_TONE: Record<string, string> = {
  Reactive: 'bg-rose-50 text-rose-700 border-rose-200',
  Diagnostic: 'bg-amber-50 text-amber-700 border-amber-200',
  Proactive: 'bg-emerald-50 text-kpmg-teal border-emerald-200',
}

const ROLE_TONE: Record<string, string> = {
  Observe: 'text-kpmg-blue',
  Judge: 'text-kpmg-violet',
  Act: 'text-kpmg-teal',
  'Roll up': 'text-slate-500',
}

export function AgentChain() {
  const ctx = useAgentContext()

  const [chainId, setChainId] = useState(CHAINS[0].id)
  const [leadId, setLeadId] = useState<string | null>(null)
  const [chained, setChained] = useState(true)
  const [run, setRun] = useState<ChainRunResult | null>(null)
  const [busy, setBusy] = useState(false)

  const chain = CHAINS.find((c) => c.id === chainId)!

  /* Customers this chain genuinely fires on, ranked by visible handoffs. */
  const candidates = useMemo(
    () => candidatesForChain(chainId, ctx),
    [chainId, ctx],
  )

  useEffect(() => {
    setLeadId(candidates[0]?.leadId ?? null)
  }, [candidates])

  useEffect(() => {
    let cancelled = false
    if (!leadId) {
      setRun(null)
      return
    }
    setBusy(true)
    // A real mode, not a display filter: isolated actually withholds
    // priorFindings from every step, so the agents fall back to raw records and
    // the evidence genuinely differs.
    runChain(chainId, leadId, ctx, { isolated: !chained })
      .then((r) => {
        if (!cancelled) setRun(r)
      })
      .finally(() => !cancelled && setBusy(false))
    return () => {
      cancelled = true
    }
  }, [chainId, leadId, chained, ctx])

  const active = candidates.find((c) => c.leadId === leadId)
  const concluded = run?.steps.filter((s) => s.status === 'concluded').length ?? 0

  return (
    <div className="animate-fade-in space-y-4">
      {/* Chain picker */}
      <div className="grid gap-3 md:grid-cols-3">
        {CHAINS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChainId(c.id)}
            className={cn(
              'rounded-xl border p-3.5 text-left transition-colors',
              c.id === chainId
                ? 'border-kpmg-blue bg-kpmg-blue/[0.05] ring-1 ring-kpmg-blue/20'
                : 'border-slate-200 bg-white hover:bg-slate-50',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-[13px] font-bold leading-snug text-slate-900">
                {c.name}
              </h3>
              <span
                className={cn(
                  'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                  KIND_TONE[c.kind],
                )}
              >
                {c.kind}
              </span>
            </div>
            <p className="mt-1.5 text-[11.5px] leading-snug text-slate-500">
              {c.premise}
            </p>
          </button>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* Customer picker */}
        <Card className="flex min-w-0 flex-col">
          <CardHeader>
            <CardTitle>Customers this chain fires on</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {candidates.length === 0 ? (
              <p className="px-4 py-4 text-[12px] leading-relaxed text-slate-500">
                No customer in the current book triggers more than one step of
                this chain. That is a fact about the data, not a loading state.
              </p>
            ) : (
              <ul>
                {candidates.map((c) => (
                  <li key={c.leadId}>
                    <button
                      type="button"
                      onClick={() => setLeadId(c.leadId)}
                      className={cn(
                        'flex w-full items-center gap-2.5 border-b border-slate-100 px-4 py-2.5 text-left transition-colors last:border-0',
                        c.leadId === leadId
                          ? 'bg-kpmg-blue/[0.06]'
                          : 'hover:bg-slate-50',
                      )}
                    >
                      <InitialsAvatar name={c.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold text-slate-900">
                          {c.name}
                        </span>
                        <span className="block text-[11px] text-slate-500">
                          {c.steps} of {chain.steps.length} steps
                          {c.handoffs > 0 && (
                            <span className="text-kpmg-teal">
                              {' '}
                              · {c.handoffs} handoff{c.handoffs === 1 ? '' : 's'}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* The trace */}
        <Card className="flex min-w-0 flex-col">
          <CardHeader>
            <CardTitle>
              {active ? `${active.name} — agent chain` : 'Agent chain'}
            </CardTitle>
            <div className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 p-0.5">
              {[
                { on: true, label: 'Chained' },
                { on: false, label: 'Isolated' },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setChained(opt.on)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition-colors',
                    chained === opt.on
                      ? 'bg-kpmg-navy text-white'
                      : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="pb-4">
            {/* What the toggle is for — stated, not left to be inferred */}
            <p className="mb-3 text-[11.5px] leading-relaxed text-slate-500">
              {chained
                ? 'Each agent can read what earlier agents concluded. A “cites” line appears wherever one rests on another rather than re-reading the raw record.'
                : 'Every agent runs blind to the others, exactly as it does in the gallery today. Compare the evidence with Chained — if it is identical, the chain is doing nothing.'}
            </p>

            {busy && (
              <p className="flex items-center gap-2 py-6 text-[12px] text-slate-500">
                <Loader2 className="size-3.5 animate-spin" /> Running the chain…
              </p>
            )}

            {!busy && run && (
              <>
                <ol className="space-y-0">
                  {run.steps.map((step, i) => {
                    const finding = step.findings[0]
                    const dim = step.status === 'nothing-to-add'
                    return (
                      <li key={`${step.agentId}-${i}`}>
                        <div
                          className={cn(
                            'rounded-xl border p-3.5',
                            dim
                              ? 'border-dashed border-slate-200 bg-slate-50/60'
                              : 'border-slate-200 bg-white shadow-card',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="nums text-[11px] font-bold text-slate-300">
                                {i + 1}
                              </span>
                              <h4
                                className={cn(
                                  'truncate text-[13px] font-bold',
                                  dim ? 'text-slate-400' : 'text-slate-900',
                                )}
                              >
                                {step.agentName.replace(' Agent', '')}
                              </h4>
                              <span
                                className={cn(
                                  'shrink-0 text-[10px] font-bold uppercase tracking-wider',
                                  dim ? 'text-slate-300' : ROLE_TONE[step.role],
                                )}
                              >
                                {step.role}
                              </span>
                            </div>
                            {dim ? (
                              <span className="flex shrink-0 items-center gap-1 text-[10.5px] font-semibold text-slate-400">
                                <CircleSlash className="size-3" />
                                Nothing to add
                              </span>
                            ) : (
                              <span className="flex shrink-0 items-center gap-1 text-[10.5px] font-semibold text-kpmg-teal">
                                <Check className="size-3" strokeWidth={2.6} />
                                Concluded
                              </span>
                            )}
                          </div>

                          {finding && (
                            <>
                              <p className="mt-1.5 text-[12.5px] font-medium leading-snug text-slate-800">
                                {finding.headline}
                              </p>
                              <ul className="mt-1.5 space-y-0.5">
                                {finding.evidence.slice(0, 3).map((e, j) => (
                                  <li
                                    key={j}
                                    className="flex gap-1.5 text-[11.5px] leading-snug text-slate-500"
                                  >
                                    <span className="mt-[7px] size-1 shrink-0 rounded-full bg-slate-300" />
                                    {e}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}

                          {/* Resolved from the cited finding — absent if nothing was handed over */}
                          {step.cited && (
                            <div className="mt-2.5 rounded-lg border-l-2 border-kpmg-violet bg-slate-50 px-3 py-2">
                              <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-kpmg-violet">
                                <Link2 className="size-3" />
                                Cites {step.cited.agentName.replace(' Agent', '')}
                              </p>
                              <p className="mt-0.5 text-[11.5px] leading-snug text-slate-600">
                                {step.cited.headline}
                              </p>
                            </div>
                          )}
                        </div>

                        {i < run.steps.length - 1 && (
                          <div className="flex justify-center py-1" aria-hidden>
                            <ArrowDown
                              className="size-3.5 text-slate-300"
                              strokeWidth={1.8}
                            />
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ol>

                {/* Consolidated brief */}
                <div className="mt-4 rounded-xl border border-kpmg-navy/20 bg-kpmg-navy/[0.03] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="flex items-center gap-1.5 text-[13px] font-bold text-slate-900">
                      <ShieldCheck className="size-4 text-kpmg-navy" strokeWidth={2.1} />
                      Consolidated brief
                    </h4>
                    <span className="nums text-[11px] font-semibold text-slate-500">
                      {concluded} of {run.steps.length} agents · {run.handoffs}{' '}
                      handoff{run.handoffs === 1 ? '' : 's'}
                    </span>
                  </div>

                  <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600">
                    {concluded === 0
                      ? 'No agent in this chain had anything to say about this customer.'
                      : `${concluded} agent${concluded === 1 ? '' : 's'} contributed. ${
                          run.handoffs > 0
                            ? `${run.handoffs} conclusion${run.handoffs === 1 ? ' was' : 's were'} carried forward rather than re-derived.`
                            : 'Each reached its conclusion independently — nothing was carried forward.'
                        }`}
                  </p>

                  {run.plans.length > 0 && (
                    <>
                      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Proposed writes · deduplicated across agents
                      </p>
                      <ul className="mt-1.5 space-y-1.5">
                        {run.plans.map((p) => (
                          <li
                            key={p.id}
                            className="flex gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                          >
                            <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-slate-400" />
                            <span className="min-w-0">
                              <span className="block text-[12px] font-semibold text-slate-800">
                                {p.label}
                              </span>
                              <span className="block text-[11px] leading-snug text-slate-500">
                                {p.crmEffect} ·{' '}
                                {AGENTS_BY_ID[p.agentId]?.name.replace(' Agent', '')}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                    <p className="text-[11px] text-slate-400">
                      Nothing here is written. The chain proposes; a human commits.
                    </p>
                    <Button size="sm" variant="outline" disabled>
                      Commit {run.plans.length} write
                      {run.plans.length === 1 ? '' : 's'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* The agents that cannot take part — named, not omitted */}
      <Card>
        <CardHeader>
          <CardTitle>Agents that cannot join a per-customer chain</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-[12px] leading-relaxed text-slate-500">
            These emit findings about the whole book rather than one customer —
            themes, clusters, campaign scores, pipeline risk — so there is nothing
            to hand to or from an individual. Established by measuring what they
            return, not by reasoning about what they sound like.
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {NON_CHAINING_AGENT_IDS.map((id) => (
              <span
                key={id}
                className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-[11.5px] font-semibold text-slate-500"
              >
                {AGENTS_BY_ID[id]?.name.replace(' Agent', '') ?? id}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
