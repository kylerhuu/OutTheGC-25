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

function toDateFromUnix(timestamp: unknown) {
  return typeof timestamp === 'number' ? new Date(timestamp * 1000) : null
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
  const items = getObjectValue(object, 'items')
  const itemData = items && Array.isArray(items.data) ? items.data : []
  const firstItem = itemData.length > 0 && itemData[0] && typeof itemData[0] === 'object'
    ? (itemData[0] as Record<string, unknown>)
    : null
  const price = firstItem ? getObjectValue(firstItem, 'price') : null

  try {
    if (event.type === 'checkout.session.completed') {
      await updateTripBillingStateByStripeReference({
        tripId: metadata ? getStringValue(metadata, 'tripId') : null,
        stripeCustomerId: getStringValue(object, 'customer'),
        stripeSubscriptionId: getStringValue(object, 'subscription'),
        ownerEmail: customerDetails ? getStringValue(customerDetails, 'email') : null,
      })
    }

    if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await updateTripBillingStateByStripeReference({
        tripId: metadata ? getStringValue(metadata, 'tripId') : null,
        stripeCustomerId: getStringValue(object, 'customer'),
        stripeSubscriptionId: getStringValue(object, 'id'),
        stripePriceId: price ? getStringValue(price, 'id') : null,
        stripeSubscriptionStatus: getStringValue(object, 'status'),
        stripeCurrentPeriodEnd: toDateFromUnix(object.current_period_end),
      })
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to process Stripe webhook.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
