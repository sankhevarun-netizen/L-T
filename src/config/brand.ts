/**
 * Single source of truth for demo branding and the signed-in persona.
 * KPMG-branded throughout; the demo client is the fictional "Meridian Developers".
 */

export const BRAND = {
  vendor: 'KPMG',
  product: 'DICE',
  productFull: 'Digital Infrastructure & Customer Experience',
  appName: 'Customer Journey Command Center',
  tagline: 'AI-Powered Customer Intelligence Platform.',
  oneLiner: 'One AI Brain. Every Customer Interaction. Every Journey.',
  demoClient: 'Meridian Developers',
  leadIdPrefix: 'MRD',
} as const

export const CURRENT_USER = {
  name: 'Anand Kumar',
  role: 'Sales Manager',
  initials: 'AK',
} as const

/** Pre-filled so the sign-in screen is a click-through, not a credentials puzzle. */
export const DEMO_CREDENTIALS = {
  email: 'anand.kumar@kpmg.com',
  password: 'kpmg-dice-demo',
} as const

/** The six value pillars rendered in the AI Command Center footer strip. */
export const VALUE_PILLARS = [
  { id: 'intent', label: 'Understand\nCustomer Intent', icon: 'Brain' },
  { id: 'nba', label: 'Recommend\nNext Best Action', icon: 'Target' },
  { id: 'automate', label: 'Automate\nFollow-ups', icon: 'Cog' },
  { id: 'convert', label: 'Improve\nConversions', icon: 'ChartColumn' },
  { id: 'revenue', label: 'Drive\nRevenue', icon: 'IndianRupee' },
  { id: 'delight', label: 'Delight\nCustomers', icon: 'HandHeart' },
] as const
