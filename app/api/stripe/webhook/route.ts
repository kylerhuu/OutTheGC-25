import { NextResponse } from 'next/server'
import { verifyStripeWebhookSignature } from '@/lib/trip-billing'
import { updateTripBillingStateByStripeReference } from '@/lib/trip-store'

function getObjectValue(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function getStringValue(record: Record<string, unknown>, key: string) {
  const value = record[key]
  return typeof value === 'string' ? value : null
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET is not set.' }, { status: 500 })
  }

  const payload = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!verifyStripeWebhookSignature(payload, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 })
  }

  const event = JSON.parse(payload) as {
    type?: string
    data?: {
      object?: Record<string, unknown>
    }
  }

  const object = event.data?.object ?? {}
  const metadata = getObjectValue(object, 'metadata')
  const customerDetails = getObjectValue(object, 'customer_details')

  try {
    if (event.type === 'checkout.session.completed') {
      await updateTripBillingStateByStripeReference({
        tripId: metadata ? getStringValue(metadata, 'tripId') : null,
        stripeCustomerId: getStringValue(object, 'customer'),
        stripeSubscriptionId: getStringValue(object, 'payment_intent'),
        ownerEmail: customerDetails ? getStringValue(customerDetails, 'email') : null,
        stripeSubscriptionStatus: 'paid',
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to process Stripe webhook.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
