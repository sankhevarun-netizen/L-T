import { notFound } from 'next/navigation'

import { UseCaseScreen } from '@/components/feedback/use-case-screen'
import { USE_CASE_ROUTES } from '@/components/feedback/use-cases'

export function generateStaticParams() {
  return USE_CASE_ROUTES.map((useCase) => ({ useCase }))
}

export default async function UseCaseRoute({
  params,
}: {
  params: Promise<{ useCase: string }>
}) {
  const { useCase } = await params
  if (!USE_CASE_ROUTES.includes(useCase)) notFound()
  return <UseCaseScreen slug={useCase} />
}
