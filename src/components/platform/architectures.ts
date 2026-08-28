import { MessagesSquare, type LucideIcon } from 'lucide-react'

import { FeedbackIntelligenceSlide } from './feedback-intelligence-slide'

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
  Component: () => React.JSX.Element
}

export const ARCHITECTURES: ArchitectureEntry[] = [
  {
    slug: 'feedback-intelligence',
    name: 'Customer Feedback Intelligence',
    shortName: 'Customer Feedback Intelligence',
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
