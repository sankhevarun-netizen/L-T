import { MessagesSquare, Network, type LucideIcon } from 'lucide-react'

import { FeedbackIntelligenceSlide } from './feedback-intelligence-slide'
import { PendingArchitecture } from './pending-architecture'

/**
 * The reference architectures this build can show.
 *
 * A registry rather than hard-wired pages: adding an architecture is one entry
 * here plus its component, and the tile grid, the route and the segmented bar
 * all pick it up without further edits.
 */
export interface ArchitectureEntry {
  slug: string
  name: string
  /** Short label for the segmented bar, where the full name will not fit. */
  shortName: string
  blurb: string
  icon: LucideIcon
  /** Descriptive chips for the tile. Plain facts about the diagram itself. */
  facts: string[]
  /** Reserved but not yet authored — the tile says so rather than implying content. */
  pending?: boolean
  Component: () => React.JSX.Element
}

export const ARCHITECTURES: ArchitectureEntry[] = [
  {
    // First in the array, so it renders left of the SPAR tile.
    slug: 'dice-clm',
    name: 'KPMG DICE Architecture for CLM',
    shortName: 'KPMG DICE for CLM',
    blurb:
      'How DICE sits across the customer lifecycle, end to end. The diagram for this tile has not been supplied yet.',
    icon: Network,
    facts: [],
    pending: true,
    Component: PendingArchitecture,
  },
  {
    slug: 'feedback-intelligence',
    name: 'KPMG SPAR AI Engine for Customer Intelligence',
    // The bar sits two-across; the full name would wrap.
    shortName: 'KPMG SPAR AI Engine',
    blurb:
      'Strengthening Voice-of-Customer insights: current challenges and existing data feeding the KPMG SPAR AI Engine, and the participation outcomes it is meant to produce.',
    icon: MessagesSquare,
    facts: ['4-stage flow', 'SPAR engine', '5-step pathway'],
    Component: FeedbackIntelligenceSlide,
  },
]

export const ARCHITECTURE_SLUGS = ARCHITECTURES.map((a) => a.slug)

export function architectureBySlug(slug: string) {
  return ARCHITECTURES.find((a) => a.slug === slug)
}
