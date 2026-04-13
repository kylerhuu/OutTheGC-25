function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set.')
  }
  return secretKey
}

async function stripeRequest(path: string, params: URLSearchParams) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })

  const payload = await response.json()

  if (!response.ok) {
    const message =
      typeof payload?.error?.message === 'string'
        ? payload.error.message
        : 'Stripe request failed.'
    throw new Error(message)
  }

  return payload
}

async function stripeGet(path: string) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getStripeSecretKey()}`,
    },
  })

  const payload = await response.json()

  if (!response.ok) {
    const message =
      typeof payload?.error?.message === 'string'
        ? payload.error.message
        : 'Stripe request failed.'
    throw new Error(message)
  }

  return payload
}

export async function createStripeCustomer(input: { email: string; tripId: string; tripName: string }) {
  const params = new URLSearchParams()
  params.set('email', input.email)
  params.set('metadata[tripId]', input.tripId)
  params.set('metadata[tripName]', input.tripName)

  const customer = await stripeRequest('customers', params)
  return customer as { id: string }
}

export async function createStripeCheckoutSession(input: {
  customerId: string
  tripId: string
  tripName: string
  successUrl: string
  cancelUrl: string
}) {
  const priceId = process.env.STRIPE_PLUS_PRICE_ID
  if (!priceId) {
    throw new Error('STRIPE_PLUS_PRICE_ID is not set.')
  }

  const params = new URLSearchParams()
  params.set('mode', 'payment')
  params.set('customer', input.customerId)
  params.set('success_url', input.successUrl)
  params.set('cancel_url', input.cancelUrl)
  params.set('allow_promotion_codes', 'true')
  params.set('line_items[0][price]', priceId)
  params.set('line_items[0][quantity]', '1')
  params.set('metadata[tripId]', input.tripId)
  params.set('metadata[tripName]', input.tripName)
  params.set('payment_intent_data[metadata][tripId]', input.tripId)
  params.set('payment_intent_data[metadata][tripName]', input.tripName)

  const session = await stripeRequest('checkout/sessions', params)
  return session as { url: string | null }
}

export async function createStripeBillingPortalSession(input: {
  customerId: string
  returnUrl: string
}) {
  const params = new URLSearchParams()
  params.set('customer', input.customerId)
  params.set('return_url', input.returnUrl)

  const session = await stripeRequest('billing_portal/sessions', params)
  return session as { url: string }
}

export async function retrieveStripeCheckoutSession(sessionId: string) {
  const session = await stripeGet(`checkout/sessions/${encodeURIComponent(sessionId)}`)
  return session as {
    id: string
    payment_status: string
    customer: string | null
    customer_details?: {
      email?: string | null
    } | null
    payment_intent?: string | null
    metadata?: {
      tripId?: string
      tripName?: string
    } | null
  }
}
