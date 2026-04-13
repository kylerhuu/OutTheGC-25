import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBaseUrl, getSafeTripReturnUrl, isStripeConfigured } from '@/lib/trip-billing'
import { createStripeCheckoutSession, createStripeCustomer } from '@/lib/stripe'
import { updateTripBillingState, verifyTripOwner } from '@/lib/trip-store'

const requestSchema = z.object({
  email: z.string().trim().email(),
  returnUrl: z.string().trim().url(),
})

interface RouteContext {
  params: Promise<{ tripId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Stripe billing is not configured.' }, { status: 500 })
    }

    const { tripId } = await context.params
    const ownerToken = request.headers.get('x-trip-owner-token') || ''
    const ownerTrip = await verifyTripOwner(tripId, ownerToken)

    if (!ownerTrip) {
      return NextResponse.json({ error: 'Only the trip owner can manage billing.' }, { status: 403 })
    }

    const body = requestSchema.parse(await request.json())
    const returnUrl = getSafeTripReturnUrl(body.returnUrl, tripId)
    const customerId =
      ownerTrip.stripeCustomerId ||
      (
        await createStripeCustomer({
          email: body.email,
          tripId,
          tripName: ownerTrip.name,
        })
      ).id

    await updateTripBillingState({
      tripId,
      ownerEmail: body.email,
      stripeCustomerId: customerId,
      stripeSubscriptionId: ownerTrip.stripeSubscriptionId,
      stripePriceId: ownerTrip.stripePriceId,
      stripeSubscriptionStatus: ownerTrip.stripeSubscriptionStatus,
      stripeCurrentPeriodEnd: ownerTrip.stripeCurrentPeriodEnd,
    })

    const successUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}&paid=true`
    const cancelUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}checkout=canceled`

    const session = await createStripeCheckoutSession({
      customerId,
      tripId,
      tripName: ownerTrip.name,
      successUrl,
      cancelUrl,
    })

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL.')
    }

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const configuredPriceId = process.env.STRIPE_PLUS_PRICE_ID || null

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Enter a valid billing email.',
          debug:
            process.env.NODE_ENV === 'production'
              ? undefined
              : {
                  stripePriceId: configuredPriceId,
                  appBaseUrl: getBaseUrl(),
                },
        },
        { status: 400 },
      )
    }

    const message = error instanceof Error ? error.message : 'Unable to start checkout.'
    return NextResponse.json(
      {
        error: message,
        debug:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                stripePriceId: configuredPriceId,
                appBaseUrl: getBaseUrl(),
              },
      },
      { status: 400 },
    )
  }
}
