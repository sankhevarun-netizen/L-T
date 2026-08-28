import { notFound } from 'next/navigation'

import { ArchitectureScreen } from '@/components/platform/architecture-screen'
import { ARCHITECTURE_SLUGS } from '@/components/platform/architectures'

export function generateStaticParams() {
  return ARCHITECTURE_SLUGS.map((architecture) => ({ architecture }))
}

export default async function ArchitectureRoute({
  params,
}: {
  params: Promise<{ architecture: string }>
}) {
  const { architecture } = await params
  if (!ARCHITECTURE_SLUGS.includes(architecture)) notFound()
  return <ArchitectureScreen slug={architecture} />
}
