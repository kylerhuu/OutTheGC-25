import { PricingPage } from '@/components/tripsync/pricing-page'

interface PricingPageRouteProps {
  searchParams: Promise<{
    tripId?: string
    returnTo?: string
    session_id?: string
    paid?: string
    checkout?: string
  }>
}

export default async function PricingPageRoute({ searchParams }: PricingPageRouteProps) {
  const resolvedSearchParams = await searchParams

  return (
    <PricingPage
      tripId={resolvedSearchParams.tripId ?? null}
      returnTo={resolvedSearchParams.returnTo ?? null}
      sessionId={resolvedSearchParams.session_id ?? null}
      paid={resolvedSearchParams.paid ?? null}
      checkout={resolvedSearchParams.checkout ?? null}
    />
  )
}
