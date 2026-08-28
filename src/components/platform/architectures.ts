import { Network, type LucideIcon } from 'lucide-react'

import { summariseCrmArchitecture } from './crm-architecture'

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
  /** Counts folded from the diagram itself, so a tile cannot drift from it. */
  summary: { layers: number; built: number; total: number }
}

export const ARCHITECTURES: ArchitectureEntry[] = [
  {
    slug: 'crm-architecture',
    name: 'CRM-Centric AI Enablement Architecture',
    shortName: 'CRM-Centric AI Enablement',
    blurb:
      'The full target stack for customer lifecycle management, from interaction channels down to the data foundation — and which parts of it this build actually demonstrates.',
    icon: Network,
    summary: summariseCrmArchitecture(),
  },
]

export const ARCHITECTURE_SLUGS = ARCHITECTURES.map((a) => a.slug)

export function architectureBySlug(slug: string) {
  return ARCHITECTURES.find((a) => a.slug === slug)
}
