import {
  Bot,
  BarChart3,
  Gauge,
  Building2,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  FileText,
  Funnel,
  Headset,
  Home,
  Layers,
  Layers3,
  MapPin,
  MessagesSquare,
  ShieldAlert,
  Sparkles,
  UserSearch,
  UsersRound,
  Wallet,
  DatabaseZap,
  Waypoints,
  Workflow,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Header title when this route is active. */
  title: string
  /** Header subtitle when this route is active. */
  subtitle: string
}

export interface NavGroup {
  id: string
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        label: 'Overview',
        href: '/',
        icon: Home,
        title: 'Customer Journey Command Center',
        subtitle: 'AI-Powered Customer Intelligence Platform.',
      },
      {
        label: 'How it Works',
        href: '/platform',
        icon: Workflow,
        title: 'DICE Platform',
        subtitle:
          'Sources to experience — and what DICE adds on top of Agentforce.',
      },
      {
        label: 'Data Ingestion',
        href: '/data-ingestion',
        icon: DatabaseZap,
        title: 'Data Ingestion',
        subtitle:
          'Pull a batch from a source system and watch EAI and sanitization run on it.',
      },
      {
        label: 'Tech Stack',
        href: '/tech-stack',
        icon: Layers3,
        title: 'Tech Stack',
        subtitle:
          'Every layer this build runs on — a request from the user down to the source records.',
      },
    ],
  },
  /*
   * Who the customer is, before what they did.
   *
   * These four were scattered: Leads sat among the transactional record tables
   * it has nothing in common with, Persona Mapping and CSAT & NPS sat among
   * agents that act when they are surfaces you read, and Customer 360 was not
   * in the rail at all. Grouped, each section has one job — understand the
   * customer, follow the journey, let agents act, manage the business.
   */
  {
    id: 'customer-intelligence',
    label: 'Customer Intelligence',
    items: [
      {
        label: 'Leads',
        href: '/leads',
        icon: UsersRound,
        title: 'Leads',
        subtitle: 'Every lead, scored and validated against real evidence.',
      },
      {
        label: 'Customer 360',
        href: '/customers',
        icon: UserSearch,
        title: 'Customer 360',
        subtitle: 'One consolidated view of the customer, across every channel.',
      },
      {
        label: 'Persona Mapping',
        href: '/persona-mapping',
        icon: Layers,
        title: 'Persona Mapping',
        subtitle:
          'Every lead scored against six buyer personas — with the evidence behind each assignment.',
      },
      {
        label: 'CSAT & NPS',
        href: '/csat-nps',
        icon: Gauge,
        title: 'CSAT & NPS Reporting',
        subtitle:
          'From descriptive scores to governed feedback intelligence — nine capabilities across two types.',
      },
    ],
  },
  {
    id: 'journey',
    label: 'Customer Journey',
    items: [
      {
        label: 'Engagements',
        href: '/engagements',
        icon: MessagesSquare,
        title: 'Engagements',
        subtitle: 'Calls, emails, WhatsApp and web activity in one timeline.',
      },
      {
        label: 'Site Visits',
        href: '/site-visits',
        icon: MapPin,
        title: 'Site Visits',
        subtitle: 'Scheduled, attended and converted — with captured feedback.',
      },
      {
        label: 'Bookings',
        href: '/bookings',
        icon: CalendarCheck,
        title: 'Bookings',
        subtitle: 'Confirmed bookings and the journeys that produced them.',
      },
      {
        label: 'Payments',
        href: '/payments',
        icon: CreditCard,
        title: 'Payments',
        subtitle: 'Milestones, schedules and collection risk.',
      },
      {
        label: 'Service Tickets',
        href: '/service-tickets',
        icon: ClipboardList,
        title: 'Service Tickets',
        subtitle: 'Post-sales requests with SLA tracking.',
      },
    ],
  },
  {
    id: 'copilots',
    label: 'AI Copilots',
    items: [
      {
        label: 'Live Transcript',
        href: '/live-transcript',
        icon: Headset,
        title: 'Real-Time Call Intelligence',
        subtitle: 'Intent detected as the call happens, flagged straight into the CRM.',
      },
      {
        label: 'Sales Copilot',
        href: '/sales-copilot',
        icon: Bot,
        title: 'Sales Copilot',
        subtitle: 'Ask, draft and act on your pipeline in plain language.',
      },
      {
        label: 'Payment Assistant',
        href: '/payment-assistant',
        icon: Wallet,
        title: 'Payment Assistant',
        subtitle: 'Payment plans, finance callbacks and query capture.',
      },
      {
        label: 'Service Assistant',
        href: '/service-assistant',
        icon: MessagesSquare,
        title: 'Service Assistant',
        subtitle: 'Summarise tickets, assess SLA risk, recommend resolution.',
      },
      {
        label: 'Agent Chain',
        href: '/agent-chain',
        icon: Waypoints,
        title: 'Agent Chain',
        subtitle:
          'Agents handing conclusions to each other for one customer — and the proof that they did.',
      },
      {
        label: 'Campaign Analytics',
        href: '/campaign-analytics',
        icon: BarChart3,
        title: 'Campaign Analytics',
        subtitle: 'Lead quality and true ROI, campaign by campaign.',
      },
    ],
  },
  {
    id: 'manager',
    label: 'Manager View',
    items: [
      {
        label: 'Pipeline Dashboard',
        href: '/pipeline-dashboard',
        icon: Funnel,
        title: 'Pipeline Dashboard',
        subtitle: 'Daily pipeline truth — stage velocity, value and stalled deals.',
      },
      {
        label: 'Projects',
        href: '/projects',
        icon: Building2,
        title: 'Project Portfolio',
        subtitle: 'Demand, conversion and booked value across every project.',
      },
      {
        label: 'Risk & Alerts',
        href: '/risk-alerts',
        icon: ShieldAlert,
        title: 'Risk & Alerts',
        subtitle: 'Prioritised risks with impacted revenue and owners.',
      },
      {
        label: 'Team Performance',
        href: '/team-performance',
        icon: UsersRound,
        title: 'Team Performance',
        subtitle: 'Rep-level throughput, backlog and coaching insight.',
      },
      {
        label: 'Reports',
        href: '/reports',
        icon: FileText,
        title: 'Reports',
        subtitle: 'Pre-built reporting across pipeline, quality and risk.',
      },
    ],
  },
]

export const PINNED_NAV: NavItem = {
  label: 'AI Insights',
  href: '/ai-insights',
  icon: Sparkles,
  title: 'AI Insights',
  subtitle: 'The DICE intelligence layer — agents, personas and platform story.',
}

/**
 * Routes that resolve a header title but never appear in the rail — reached by
 * drilling in from a card rather than by navigating.
 *
 * Empty at present. Customer 360 lived here while `/customers` was a header
 * entry with no page behind it; now that the page exists it belongs in the
 * rail, and `/customers/<id>` still resolves through it by the prefix rule.
 * The mechanism stays because the next drill-in-only route will want it.
 */
export const EXTRA_ROUTES: NavItem[] = []

const ALL_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((group) => group.items),
  PINNED_NAV,
  ...EXTRA_ROUTES,
]

/** Resolve the header title/subtitle for a pathname (longest prefix wins). */
export function resolveNavItem(pathname: string): NavItem {
  const exact = ALL_ITEMS.find((item) => item.href === pathname)
  if (exact) return exact

  const prefixed = ALL_ITEMS.filter(
    (item) => item.href !== '/' && pathname.startsWith(`${item.href}/`),
  ).sort((a, b) => b.href.length - a.href.length)[0]

  return prefixed ?? ALL_ITEMS[0]
}

export function isNavItemActive(href: string, pathname: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
