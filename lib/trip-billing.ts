import crypto from 'crypto'

export const OUTTHEGC_PLUS_PRICE_USD = 5
export const OUTTHEGC_PLUS_REQUIRED_CODE = 'OUTTHEGC_PLUS_REQUIRED'

export function generateTripOwnerToken() {
  return crypto.randomBytes(24).toString('hex')
}

export function hashTripOwnerToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export function hasTripPlusAccess(planTier: string | null | undefined, status: string | null | undefined) {
  return planTier === 'plus' || status === 'paid' || status === 'active' || status === 'trialing'
}

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

export function getAllowedAppOrigins() {
  return Array.from(
    new Set(
      [process.env.NEXT_PUBLIC_BASE_URL, 'http://localhost:3000', 'https://outthegc.app', 'https://www.outthegc.app']
        .filter((value): value is string => Boolean(value))
        .map((value) => new URL(value).origin),
    ),
  )
}

export function getSafeTripReturnUrl(rawUrl: string, tripId: string) {
  const parsedUrl = new URL(rawUrl)

  if (!getAllowedAppOrigins().includes(parsedUrl.origin)) {
    throw new Error('Invalid return URL origin.')
  }

  const allowedPath = new RegExp(`^/(event|results|plan|plus)/${tripId}(?:/)?$`)
  if (!allowedPath.test(parsedUrl.pathname)) {
    throw new Error('Invalid return URL path.')
  }

  parsedUrl.searchParams.delete('checkout')
  parsedUrl.searchParams.delete('paid')
  parsedUrl.searchParams.delete('session_id')
  parsedUrl.hash = ''

  return parsedUrl.toString()
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PLUS_PRICE_ID)
}

export function verifyStripeWebhookSignature(payload: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader) return false

  const fields = signatureHeader.split(',').reduce<Record<string, string[]>>((acc, entry) => {
    const [key, value] = entry.split('=')
    if (!key || !value) return acc
    acc[key] = acc[key] ? [...acc[key], value] : [value]
    return acc
  }, {})

  const timestamp = fields.t?.[0]
  const signatures = fields.v1 ?? []

  if (!timestamp || signatures.length === 0) return false

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`, 'utf8')
    .digest('hex')

  return signatures.some((signature) => {
    const actual = Buffer.from(signature, 'hex')
    const expectedBuffer = Buffer.from(expected, 'hex')
    if (actual.length !== expectedBuffer.length) return false
    return crypto.timingSafeEqual(actual, expectedBuffer)
  })
}
