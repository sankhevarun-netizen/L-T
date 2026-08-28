import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * CRM-Centric AI Enablement Architecture.
 *
 * The full target-state stack from the KPMG PoV, six layers deep. Most of it is
 * not built here and saying so is the point: a slide like this reproduced
 * unmarked claims the demo covers an entire enterprise architecture, which it
 * plainly does not.
 *
 * So every item that this build actually demonstrates carries a tick and names
 * the screen or agent behind it. A tick is never decoration — if you cannot
 * point at it in the running product, it does not get one, and unmarked is the
 * safe default. The distinction is carried by an icon and a text label rather
 * than by colour, so it survives a projector and a colour-blind viewer.
 */

interface Item {
  label: string
  /** The screen or agent you can point at. Absent means not built here. */
  built?: string
}

interface Group {
  title?: string
  items: Item[]
}

interface Layer {
  n: number
  label: string
  /** The full-width strip the slide draws across some layers. */
  banner?: string
  groups: Group[]
  /** Layer 5 — the slide's own "Our focus". */
  focus?: boolean
  /** Layer 5 numbers its four capability areas. */
  numbered?: boolean
}

const LAYERS: Layer[] = [
  {
    n: 1,
    label: 'Customer & business interaction channels',
    groups: [
      {
        items: [
          { label: 'Website & portals', built: 'Engagements' },
          { label: 'Digital campaigns', built: 'Campaign analytics' },
          { label: 'WhatsApp', built: 'Engagements' },
          { label: 'Email', built: 'Engagements' },
          { label: 'Call center', built: 'Live transcript' },
          { label: 'Channel partners' },
          { label: 'Site visits / walk-ins', built: 'Site visits' },
          { label: 'Customer portal / app' },
          { label: 'Surveys & feedback', built: 'CSAT & NPS' },
          { label: 'Service tickets', built: 'Service tickets' },
        ],
      },
    ],
  },
  {
    n: 2,
    label: 'Data foundation & Customer 360',
    banner: 'Unified customer 360 & data foundation',
    groups: [
      {
        items: [
          { label: 'Data ingestion (APIs, batch, streams)' },
          { label: 'Data quality & validation' },
          { label: 'Identity resolution & deduplication' },
          {
            label: 'Consent & preference management',
            built: 'Do-not-contact suppression',
          },
          {
            label: 'Interaction & transaction history',
            built: 'Engagements, Payments',
          },
          { label: 'Behavioural & contextual data', built: 'Lead evidence' },
        ],
      },
    ],
  },
  {
    n: 3,
    label: 'CRM as central system of action',
    banner: 'CRM — single source of customer truth & action',
    groups: [
      {
        items: [
          { label: 'Lead management', built: 'Leads' },
          { label: 'Opportunities & pipeline', built: 'Pipeline dashboard' },
          { label: 'Customer 360 profile', built: 'Customers' },
          { label: 'Site visit & interactions', built: 'Site visits' },
          { label: 'Booking & transactions', built: 'Bookings, Payments' },
          { label: 'Service & post-sales', built: 'Service tickets' },
          { label: 'Feedback (CSAT/NPS)', built: 'CSAT & NPS' },
          { label: 'Workflows, tasks & alerts', built: 'Risk alerts, Tasks' },
          { label: 'Dashboards & analytics', built: 'Reports' },
        ],
      },
    ],
  },
  {
    n: 4,
    label: 'AI intelligence & orchestration layer',
    groups: [
      {
        title: 'AI model & intelligence layer',
        items: [
          { label: 'Lead scoring & ranking', built: 'Lead score' },
          { label: 'Intent prediction', built: 'Sentiment & Intent Detection' },
          { label: 'Persona & segmentation models', built: 'Persona mapping' },
          { label: 'Propensity & affinity models', built: 'Response propensity' },
          { label: 'Sentiment & conversation AI', built: 'Live transcript' },
          { label: 'NPS drivers & satisfaction models', built: 'Root cause' },
        ],
      },
      {
        title: 'AI orchestration & workflow layer',
        items: [
          { label: 'Next best action recommendation', built: 'Next Best Action' },
          { label: 'Lead routing & assignment' },
          { label: 'Journey triggers & automation' },
          { label: 'Task creation & alerts', built: 'CRM activity feed' },
          {
            label: 'Escalation & approval workflows',
            built: 'Recovery escalation path',
          },
          { label: 'CRM recommendations', built: 'Agent action plans' },
        ],
      },
      {
        title: 'AI governance & trust layer',
        items: [
          { label: 'Responsible AI principles', built: 'Guardrail badges' },
          {
            label: 'Human-in-the-loop controls',
            built: 'Propose-then-commit on every write',
          },
          { label: 'Data privacy & security' },
          { label: 'Model monitoring & drift detection' },
          {
            label: 'Audit trails & explainability',
            built: 'Activity feed, evidence lists',
          },
          { label: 'Role based access & compliance' },
        ],
      },
    ],
  },
  {
    n: 5,
    label: 'AI-enabled CRM capability areas',
    focus: true,
    numbered: true,
    groups: [
      {
        title: 'Lead quality & scoring',
        items: [
          { label: 'Dynamic lead scoring', built: 'Leads' },
          { label: 'Intent validation & prioritization', built: 'AI Lead Validation' },
          { label: 'Lead leakage detection', built: 'Risk alerts' },
          { label: 'Source quality & ROI', built: 'Campaign analytics' },
          { label: 'Next best action for follow-up', built: 'Next Best Action' },
        ],
      },
      {
        title: 'Customer personas',
        items: [
          { label: 'Dynamic persona creation', built: 'Persona mapping' },
          { label: 'Property-fit recommendations' },
          { label: 'Preference & affordability insights' },
          { label: 'Next best property / offer / channel', built: 'Next Best Action' },
          { label: 'Cross-project & inventory matching' },
        ],
      },
      {
        title: 'Customer experience',
        items: [
          { label: 'Customer 360 view', built: 'Customers' },
          { label: 'Omnichannel engagement', built: 'Engagements' },
          { label: 'Journey orchestration', built: 'Feedback journey' },
          {
            label: 'Service & sales copilot',
            built: 'Sales copilot, Service assistant',
          },
          { label: 'Proactive & personalized journeys', built: 'SPAR engine' },
        ],
      },
      {
        title: 'CSAT & NPS performance',
        items: [
          { label: 'Feedback collection at key touchpoints', built: 'Six touchpoints' },
          { label: 'Sentiment & root cause analysis', built: 'VoC Analyzer, Root Cause' },
          { label: 'Detractor risk & recovery actions', built: 'Recovery Copilot' },
          { label: 'Satisfaction & NPS dashboards', built: 'NPS reporting' },
          { label: 'Closed-loop resolution & insights', built: 'Control Tower' },
        ],
      },
    ],
  },
  {
    n: 6,
    label: 'Data & technology foundation',
    groups: [
      {
        items: [
          { label: 'Cloud infrastructure (secure & scalable)' },
          { label: 'Data lake & warehouse' },
          { label: 'Integration layer (APIs & connectors)' },
          { label: 'AI/ML platform & tooling' },
          { label: 'Master data management' },
          { label: 'Security & access controls' },
        ],
      },
    ],
  },
]

/** The right-hand rail. Business outcomes the stack is meant to move. */
const OUTCOMES = [
  'Higher qualified lead conversion',
  'Faster response & follow-up',
  'Reduced lead leakage',
  'Better persona-based engagement',
  'Improved customer satisfaction & loyalty',
  'Closed-loop service recovery',
  'Better campaign ROI & resource efficiency',
  'Leadership visibility & decision intelligence',
]

/**
 * Facts about the diagram, folded from the diagram's own data.
 *
 * The tile that links here shows layer and coverage counts. Typing those by
 * hand would let the tile drift from the thing it describes the moment a mark
 * is added or removed, so it reads them from LAYERS instead.
 */
export function summariseCrmArchitecture() {
  const items = LAYERS.flatMap((l) => l.groups.flatMap((g) => g.items))
  return {
    layers: LAYERS.length,
    built: items.filter((i) => i.built).length,
    total: items.length,
  }
}

function countBuilt(layer: Layer) {
  const items = layer.groups.flatMap((g) => g.items)
  return { built: items.filter((i) => i.built).length, total: items.length }
}

function ItemRow({ item }: { item: Item }) {
  return (
    <li className="flex items-start gap-1.5 py-[3px]">
      {item.built ? (
        <Check
          className="mt-[3px] size-3 shrink-0 text-kpmg-teal"
          strokeWidth={2.6}
        />
      ) : (
        <span className="mt-[7px] size-1 shrink-0 rounded-full bg-slate-300" />
      )}
      <span className="min-w-0">
        <span
          className={cn(
            'text-[11.5px] leading-snug',
            item.built ? 'text-slate-700' : 'text-slate-500',
          )}
        >
          {item.label}
        </span>
        {item.built && (
          <span className="ml-1 text-[10.5px] text-kpmg-teal">
            &middot; {item.built}
          </span>
        )}
      </span>
    </li>
  )
}

export function CrmArchitecture() {
  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_216px]">
      {/* The six layers */}
      <div className="flex min-w-0 flex-col gap-2">
        {LAYERS.map((layer) => {
          const { built, total } = countBuilt(layer)

          return (
            <div
              key={layer.n}
              className={cn(
                'flex flex-col gap-2 rounded-xl border p-2.5 sm:flex-row',
                layer.focus
                  ? 'border-kpmg-violet/30 bg-kpmg-violet/[0.04] ring-1 ring-kpmg-violet/15'
                  : 'border-slate-200 bg-white',
              )}
            >
              {/* Numbered rail */}
              <div
                className={cn(
                  'flex shrink-0 flex-row items-center gap-2 rounded-lg px-2.5 py-2 text-white sm:w-[152px] sm:flex-col sm:items-start sm:justify-center',
                  layer.focus ? 'bg-kpmg-violet' : 'bg-rail-800',
                )}
              >
                <span className="nums text-[15px] font-bold leading-none opacity-70">
                  {layer.n}
                </span>
                <span className="text-[11.5px] font-bold leading-tight">
                  {layer.label}
                </span>
                {layer.focus && (
                  <span className="shrink-0 rounded-full bg-white/20 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider">
                    Our focus
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  {layer.banner ? (
                    <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {layer.banner}
                    </p>
                  ) : (
                    <span />
                  )}
                  {/* Coverage stated as a number, never implied by colour alone. */}
                  <span
                    className={cn(
                      'nums shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      built === 0
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-kpmg-teal/10 text-kpmg-teal',
                    )}
                  >
                    {built === 0
                      ? 'Target architecture'
                      : `${built} of ${total} in this build`}
                  </span>
                </div>

                <div
                  className={cn(
                    'grid gap-x-4 gap-y-1',
                    layer.groups.length > 1
                      ? 'lg:grid-cols-3'
                      : 'sm:grid-cols-2 lg:grid-cols-3',
                  )}
                >
                  {layer.groups.map((group, gi) => (
                    <div key={group.title ?? gi} className="min-w-0">
                      {group.title && (
                        <p className="mb-0.5 flex items-baseline gap-1 text-[11.5px] font-bold text-slate-700">
                          {layer.numbered && (
                            <span className="nums text-kpmg-violet">
                              {gi + 1}
                            </span>
                          )}
                          {group.title}
                        </p>
                      )}
                      <ul>
                        {group.items.map((item) => (
                          <ItemRow key={item.label} item={item} />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Business outcomes rail */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Business outcomes
        </p>
        <ul className="mt-2 space-y-2">
          {OUTCOMES.map((outcome) => (
            <li key={outcome} className="flex gap-1.5">
              <span className="mt-[6px] size-1 shrink-0 rounded-full bg-kpmg-blue/40" />
              <span className="text-[11.5px] leading-snug text-slate-600">
                {outcome}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** Stated under the diagram so the tick convention is never ambiguous. */
export const CRM_ARCHITECTURE_NOTE =
  'A tick marks a capability this build actually demonstrates, and names the screen or agent behind it. Everything unticked is the target architecture — shown because it is where this work sits, not because it ships today.'

