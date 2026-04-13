import { NextResponse } from 'next/server'
import { retrieveStripeCheckoutSession } from '@/lib/stripe'
import { getTripBillingRecord, updateTripBillingState } from '@/lib/trip-store'

interface RouteContext {
  params: Promise<{ tripId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { tripId } = await context.params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')?.trim()

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id.' }, { status: 400 })
    }

    const session = await retrieveStripeCheckoutSession(sessionId)

    if (session.metadata?.tripId !== tripId) {
      return NextResponse.json({ error: 'Checkout session does not match this trip.' }, { status: 400 })
    }

    if (session.payment_status === 'paid') {
      await updateTripBillingState({
        tripId,
        ownerEmail: session.customer_details?.email ?? undefined,
        stripeCustomerId: session.customer ?? undefined,
        stripeSubscriptionId: session.payment_intent ?? undefined,
        stripeSubscriptionStatus: 'paid',
      })
    }

    const billing = await getTripBillingRecord(tripId)

    return NextResponse.json({
      paid: session.payment_status === 'paid',
      billing,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to verify checkout session.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
