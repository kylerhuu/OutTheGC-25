import { NextResponse } from 'next/server'
import { createStripeBillingPortalSession } from '@/lib/stripe'
import { getBaseUrl } from '@/lib/trip-billing'
import { verifyTripOwner } from '@/lib/trip-store'

interface RouteContext {
  params: Promise<{ tripId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { tripId } = await context.params
    const ownerToken = request.headers.get('x-trip-owner-token') || ''
    const ownerTrip = await verifyTripOwner(tripId, ownerToken)

    if (!ownerTrip) {
      return NextResponse.json({ error: 'Only the trip owner can manage billing.' }, { status: 403 })
    }

    if (!ownerTrip.stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer exists for this trip yet.' }, { status: 400 })
    }

    const session = await createStripeBillingPortalSession({
      customerId: ownerTrip.stripeCustomerId,
      returnUrl: `${getBaseUrl()}/plan/${tripId}`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to open billing portal.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
