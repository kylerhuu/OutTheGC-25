'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, Loader2, Sparkles, Zap } from 'lucide-react'
import { OutTheGCLogo } from '@/components/tripsync/outthegc-logo'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { parseStoredDate } from '@/lib/date-utils'
import { readTripOwnerToken } from '@/lib/trip-owner'
import type { TripPlanPageData } from '@/lib/trip-types'

interface PricingPayload extends Partial<TripPlanPageData> {
  error?: string
}

interface PricingPageProps {
  tripId: string | null
  returnTo: string | null
  sessionId: string | null
  paid: string | null
  checkout: string | null
}

function formatDateRange(from: Date, to: Date) {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  return `${from.toLocaleDateString('en-US', options)} - ${to.toLocaleDateString('en-US', options)}`
}

export function PricingPage({ tripId, returnTo, sessionId, paid, checkout }: PricingPageProps) {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<TripPlanPageData | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(tripId))
  const [loadError, setLoadError] = useState<string | null>(null)
  const [ownerToken, setOwnerToken] = useState<string | null>(null)
  const [billingEmail, setBillingEmail] = useState('')
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)
  const [isStartingCheckout, setIsStartingCheckout] = useState(false)
  const [isVerifyingCheckout, setIsVerifyingCheckout] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!tripId) {
      setOwnerToken(null)
      return
    }

    setOwnerToken(readTripOwnerToken(tripId))
  }, [tripId])

  const loadTripContext = useCallback(async () => {
    if (!tripId) {
      setData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)

    try {
      const response = await fetch(`/api/trips/${tripId}/plan`, { cache: 'no-store' })
      const payload = (await response.json()) as PricingPayload

      if (!response.ok || !payload.trip || !payload.plan || !payload.suggestions || !payload.billing) {
        throw new Error(payload.error || 'Unable to load pricing for this trip.')
      }

      setData({
        trip: payload.trip,
        plan: payload.plan,
        suggestions: payload.suggestions,
        billing: payload.billing,
      })
      setBillingEmail(payload.billing.ownerEmail || '')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load pricing for this trip.')
    } finally {
      setIsLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    void loadTripContext()
  }, [loadTripContext])

  useEffect(() => {
    if (checkout === 'canceled') {
      setCheckoutMessage(null)
      setCheckoutError('Checkout was canceled.')
      return
    }

    if (!tripId || !sessionId || paid !== 'true') {
      return
    }

    const verifiedSessionId = sessionId
    let isActive = true

    async function verifyCheckoutSession() {
      setIsVerifyingCheckout(true)
      setCheckoutError(null)
      setCheckoutMessage('Confirming your payment...')

      try {
        const response = await fetch(
          `/api/trips/${tripId}/billing/verify-session?session_id=${encodeURIComponent(verifiedSessionId)}`,
          { cache: 'no-store' },
        )
        const payload = (await response.json()) as {
          paid?: boolean
          billing?: TripPlanPageData['billing']
          error?: string
        }

        if (!response.ok) {
          throw new Error(payload.error || 'Unable to verify payment.')
        }

        if (!isActive) return

        if (payload.paid) {
          setData((current) =>
            current && payload.billing
              ? {
                  ...current,
                  billing: payload.billing,
                }
              : current,
          )
          setCheckoutMessage('Payment confirmed. OutTheGC Plus is unlocked for this event.')
          setCheckoutError(null)
          void loadTripContext()
        } else {
          setCheckoutMessage(null)
          setCheckoutError('Payment has not completed yet. Refresh in a moment if Stripe just finished.')
        }
      } catch (error) {
        if (!isActive) return
        setCheckoutMessage(null)
        setCheckoutError(error instanceof Error ? error.message : 'Unable to verify payment.')
      } finally {
        if (isActive) {
          setIsVerifyingCheckout(false)
          const nextUrl = new URL(window.location.href)
          nextUrl.searchParams.delete('session_id')
          nextUrl.searchParams.delete('paid')
          nextUrl.searchParams.delete('checkout')
          window.history.replaceState({}, '', nextUrl.toString())
        }
      }
    }

    void verifyCheckoutSession()

    return () => {
      isActive = false
    }
  }, [checkout, loadTripContext, paid, sessionId, tripId])

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return `${process.env.NEXT_PUBLIC_BASE_URL || 'https://outthegc.app'}/pricing${tripId ? `?tripId=${tripId}` : ''}`
    }

    return window.location.href
  }, [tripId])

  const checkoutReturnUrl = useMemo(() => {
    if (!tripId) return null

    if (typeof window === 'undefined') {
      return `${process.env.NEXT_PUBLIC_BASE_URL || 'https://outthegc.app'}/plan/${tripId}`
    }

    const origin = window.location.origin
    if (returnTo && returnTo.startsWith('/')) {
      return `${origin}${returnTo}`
    }

    return `${origin}/plan/${tripId}`
  }, [returnTo, tripId])

  const startCheckout = useCallback(async () => {
    if (!tripId) {
      setCheckoutError('Create an event first, then upgrade that event to OutTheGC Plus.')
      return
    }

    if (!ownerToken) {
      setCheckoutError('Open pricing from the browser session that created the event to buy OutTheGC Plus.')
      return
    }

    if (!billingEmail.trim()) {
      setCheckoutError('Enter an email for the Stripe receipt.')
      return
    }

    if (!checkoutReturnUrl) {
      setCheckoutError('Could not determine where to send you back after checkout.')
      return
    }

    setIsStartingCheckout(true)
    setCheckoutError(null)

    try {
      const response = await fetch(`/api/trips/${tripId}/billing/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-trip-owner-token': ownerToken,
        },
        body: JSON.stringify({ email: billingEmail.trim(), returnUrl: checkoutReturnUrl }),
      })

      const payload = (await response.json()) as { url?: string; error?: string }

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || 'Unable to start checkout.')
      }

      window.location.href = payload.url
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Unable to start checkout.')
    } finally {
      setIsStartingCheckout(false)
    }
  }, [billingEmail, checkoutReturnUrl, ownerToken, tripId])

  const tripBackHref = returnTo && returnTo.startsWith('/') ? returnTo : tripId ? `/plan/${tripId}` : '/'

  return (
    <main className="min-h-screen bg-background">
      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-6 -z-10 h-[720px] overflow-hidden">
          <div
            className={`absolute -left-20 top-6 h-72 w-72 rounded-full bg-gradient-to-br from-primary/25 via-primary/10 to-transparent blur-3xl transition-opacity duration-1000 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ animation: mounted ? 'pricingFloat 9s ease-in-out infinite' : 'none' }}
          />
          <div
            className={`absolute right-0 top-24 h-80 w-80 rounded-full bg-gradient-to-bl from-accent/18 via-accent/8 to-transparent blur-3xl transition-opacity duration-1000 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ animation: mounted ? 'pricingFloat 11s ease-in-out infinite reverse' : 'none' }}
          />
          <div className="absolute left-1/2 top-32 h-64 w-64 -translate-x-1/2 rounded-full bg-gradient-to-r from-primary/8 via-accent/10 to-transparent blur-3xl" />
        </div>

        <header className="flex flex-col gap-4 rounded-[28px] border border-border/60 bg-card/90 px-6 py-5 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="w-fit">
            <OutTheGCLogo markClassName="h-9 w-9" textClassName="h-7" />
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/">Home</Link>
            </Button>
            {tripId ? (
              <Button asChild>
                <Link href={tripBackHref}>
                  <ArrowLeft className="size-4" />
                  Back to event
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/">Create event</Link>
              </Button>
            )}
          </div>
        </header>

        <section className="overflow-hidden rounded-[36px] border border-primary/20 bg-[radial-gradient(circle_at_top_left,rgba(66,183,245,0.24),transparent_35%),radial-gradient(circle_at_top_right,rgba(79,224,188,0.18),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.88),rgba(245,247,255,0.94))] px-6 py-12 shadow-[0_30px_90px_rgba(78,110,190,0.12)] sm:px-10">
          <div className="mx-auto grid max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div
              className="text-center lg:text-left"
              style={{ animation: mounted ? 'pricingSlideUp 0.8s ease-out both' : 'none' }}
            >
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Pricing
              </p>
              <h1 className="mt-5 text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
                Start free.
                <span className="block text-balance text-muted-foreground">Upgrade each event only when you want AI help.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground lg:max-w-xl">
                OutTheGC stays free for the core planning flow. OutTheGC Plus is a one-time unlock per event for unlimited AI organization, with more paid perks coming later.
              </p>
              {tripId && data?.trip ? (
                <div className="mt-8 flex w-fit flex-wrap items-center gap-3 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm text-foreground shadow-sm max-lg:mx-auto">
                  <span className="font-semibold">Current event:</span>
                  <span>{data.trip.name}</span>
                  <span className="text-muted-foreground">
                    {formatDateRange(parseStoredDate(data.trip.startDate), parseStoredDate(data.trip.endDate))}
                  </span>
                </div>
              ) : (
                <div className="mt-8 w-fit rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm text-muted-foreground shadow-sm max-lg:mx-auto">
                  No account system yet, so Plus is unlocked per event.
                </div>
              )}
            </div>

            <div
              className="relative flex items-center justify-center"
              style={{ animation: mounted ? 'pricingSlideUp 0.8s ease-out 0.15s both' : 'none' }}
            >
              <div className="relative w-full max-w-sm">
                <div
                  className="relative rounded-[32px] border border-primary/30 bg-[linear-gradient(180deg,rgba(79,224,188,0.1),rgba(255,255,255,0.94))] p-6 shadow-[0_30px_80px_rgba(61,153,199,0.18)]"
                  style={{ animation: mounted ? 'pricingCardLift 4s ease-in-out infinite' : 'none' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      <Zap className="size-3.5" />
                      Plus
                    </div>
                    <div className="h-3 w-3 rounded-full bg-primary animate-pulse" />
                  </div>
                  <p className="mt-5 text-5xl font-semibold tracking-tight text-foreground">$5</p>
                  <p className="mt-2 text-sm text-muted-foreground">One-time unlock for one event</p>
                  <div className="mt-6 rounded-2xl border border-primary/20 bg-background/80 px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">Unlimited AI organization</p>
                    <p className="mt-1 text-sm text-muted-foreground">Turn rough notes into clean plans instantly.</p>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-primary/10 p-3 text-center">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Best for</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">Messy group plans</p>
                    </div>
                    <div className="rounded-2xl bg-accent/8 p-3 text-center">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Unlocks</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">AI cleanup</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]"
          style={{ animation: mounted ? 'pricingSlideUp 0.8s ease-out 0.25s both' : 'none' }}
        >
          <PricingCard
            eyebrow="Free"
            priceLabel="Free"
            description="General access to the planning flow for any event."
            buttonLabel="Included by default"
            buttonVariant="outline"
            bullets={[
              'Create and share event links',
              'Collect responses and compare availability',
              'Lock dates, destination, and planning notes',
              'Use the planning board like a shared group doc',
              'Edit the final trip doc manually',
            ]}
          />

          <PricingCard
            eyebrow="OutTheGC Plus"
            priceLabel={`$${data?.billing.priceUsd ?? 5} one-time`}
            description="Buy it for a single event when you want AI to clean up the mess."
            buttonLabel={data?.billing.hasPlusAccess ? 'Unlocked for this event' : 'This is the one'}
            buttonVariant="default"
            highlighted
            bullets={[
              'Everything in Free',
              'Unlimited AI organization for that event',
              'AI cleanup for rough notes, links, and planning dumps',
              'One-click final doc organization',
              'Future event-level Plus features as they ship',
            ]}
          />
        </section>

        <Card
          className="border-border/60 bg-card/95 shadow-sm"
          style={{ animation: mounted ? 'pricingSlideUp 0.8s ease-out 0.35s both' : 'none' }}
        >
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-foreground">How this works right now</p>
              <p className="text-sm leading-7 text-muted-foreground">
                OutTheGC Plus is attached to one event because there is no full account system yet. Later, if you add accounts, this can become a subscription model. For now it stays simple: free by default, upgrade a specific event when you want AI.
              </p>
              {tripId && data?.billing.hasPlusAccess ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-emerald-500/15 p-2 text-emerald-700">
                      <Check className="size-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">OutTheGC Plus unlocked</p>
                      <p className="text-sm text-muted-foreground">This event already has unlimited AI organization enabled.</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-primary/20 bg-primary/5 p-5">
              <p className="text-sm font-semibold text-foreground">Upgrade this event</p>
              {tripId ? (
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="billing-email" className="text-sm font-medium text-foreground">
                      Receipt email
                    </label>
                    <Input
                      id="billing-email"
                      type="email"
                      value={billingEmail}
                      onChange={(event) => setBillingEmail(event.target.value)}
                      placeholder="you@example.com"
                      disabled={isLoading}
                    />
                  </div>
                  <Button
                    onClick={() => void startCheckout()}
                    disabled={
                      isLoading ||
                      isStartingCheckout ||
                      isVerifyingCheckout ||
                      data?.billing.hasPlusAccess ||
                      !data?.billing.stripeConfigured ||
                      !ownerToken
                    }
                    className="w-full"
                  >
                    {isStartingCheckout ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    {data?.billing.hasPlusAccess ? 'Already unlocked' : `Pay $${data?.billing.priceUsd ?? 5} for this event`}
                  </Button>
                  <p className="rounded-2xl border border-primary/15 bg-background/80 px-4 py-3 text-sm font-medium text-foreground">
                    {data?.billing.hasPlusAccess
                      ? 'This event already has Plus access.'
                      : 'Click the button above to unlock unlimited AI organization for this event.'}
                  </p>
                  {checkoutMessage && <p className="text-sm text-foreground">{checkoutMessage}</p>}
                  {checkoutError && <p className="text-sm text-destructive">{checkoutError}</p>}
                  {loadError && <p className="text-sm text-destructive">{loadError}</p>}
                  {!data?.billing.stripeConfigured && (
                    <p className="text-sm text-destructive">Stripe still needs to be configured before checkout can work.</p>
                  )}
                  {!ownerToken && (
                    <p className="text-sm text-muted-foreground">
                      Open pricing from the browser session that created the event to buy Plus for that event.
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <p className="text-sm leading-7 text-muted-foreground">
                    Pricing is event-based right now. Create an event first, then come back here from that event to unlock Plus.
                  </p>
                  <Button asChild className="w-full">
                    <Link href="/">Create an event</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <footer className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Per-event pricing now. Account-level subscriptions can come later.</p>
          <p>{shareUrl.replace(/^https?:\/\//, '')}</p>
        </footer>
      </div>

      <style jsx>{`
        @keyframes pricingSlideUp {
          from {
            opacity: 0;
            transform: translateY(28px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pricingFloat {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-26px);
          }
        }

        @keyframes pricingCardLift {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-16px);
          }
        }
      `}</style>
    </main>
  )
}

function PricingCard({
  eyebrow,
  priceLabel,
  description,
  bullets,
  buttonLabel,
  buttonVariant,
  highlighted = false,
}: {
  eyebrow: string
  priceLabel: string
  description: string
  bullets: string[]
  buttonLabel: string
  buttonVariant: 'default' | 'outline'
  highlighted?: boolean
}) {
  return (
    <div
      className={`rounded-[32px] border p-6 shadow-sm ${
        highlighted
          ? 'border-primary/30 bg-[linear-gradient(180deg,rgba(79,224,188,0.1),rgba(66,183,245,0.08))] shadow-[0_28px_80px_rgba(61,153,199,0.18)]'
          : 'border-border/60 bg-card/95 shadow-[0_18px_45px_rgba(35,44,92,0.08)]'
      }`}
    >
      <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${highlighted ? 'text-primary' : 'text-muted-foreground'}`}>
        {eyebrow}
      </p>
      <p className="mt-4 text-5xl font-semibold tracking-tight text-foreground">{priceLabel}</p>
      <p className="mt-4 text-base leading-7 text-muted-foreground">{description}</p>
      <Button
        variant={buttonVariant}
        className={`mt-6 w-full justify-center ${highlighted ? 'shadow-lg shadow-primary/25' : ''}`}
        disabled
      >
        {buttonLabel}
      </Button>
      <div className="mt-6 h-px bg-border/70" />
      <div className="mt-6 space-y-3">
        {bullets.map((bullet) => (
          <div key={bullet} className="flex gap-3">
            <span className="mt-2 size-2 shrink-0 rounded-full bg-primary/70" />
            <p className="text-sm leading-6 text-muted-foreground">{bullet}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
