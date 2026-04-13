'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Check, Loader2, Sparkles } from 'lucide-react'
import { EventTopBar } from '@/components/tripsync/event-top-bar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { parseStoredDate } from '@/lib/date-utils'
import { readTripOwnerToken } from '@/lib/trip-owner'
import type { TripPlanPageData } from '@/lib/trip-types'

interface PlusPayload extends Partial<TripPlanPageData> {
  error?: string
}

function formatDateRange(from: Date, to: Date) {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  return `${from.toLocaleDateString('en-US', options)} - ${to.toLocaleDateString('en-US', options)}`
}

export default function PlusPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const tripId = params.tripId as string
  const [data, setData] = useState<TripPlanPageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [ownerToken, setOwnerToken] = useState<string | null>(null)
  const [billingEmail, setBillingEmail] = useState('')
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [isStartingCheckout, setIsStartingCheckout] = useState(false)
  const [isVerifyingCheckout, setIsVerifyingCheckout] = useState(false)
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null)

  useEffect(() => {
    setOwnerToken(readTripOwnerToken(tripId))
  }, [tripId])

  const loadPage = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const response = await fetch(`/api/trips/${tripId}/plan`, { cache: 'no-store' })
      const payload = (await response.json()) as PlusPayload

      if (!response.ok || !payload.trip || !payload.plan || !payload.suggestions || !payload.billing) {
        throw new Error(payload.error || 'Unable to load OutTheGC Plus.')
      }

      setData({
        trip: payload.trip,
        plan: payload.plan,
        suggestions: payload.suggestions,
        billing: payload.billing,
      })
      setBillingEmail(payload.billing.ownerEmail || '')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load OutTheGC Plus.')
    } finally {
      setIsLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    const checkoutState = searchParams.get('checkout')
    const paidFlag = searchParams.get('paid')

    if (checkoutState === 'canceled') {
      setCheckoutMessage(null)
      setCheckoutError('Checkout was canceled.')
      return
    }

    if (!sessionId || paidFlag !== 'true') {
      return
    }

    let isActive = true

    const verifiedSessionId = sessionId

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
          setCheckoutMessage('Payment confirmed. OutTheGC Plus is unlocked for this trip.')
          setCheckoutError(null)
          void loadPage()
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
  }, [loadPage, searchParams, tripId])

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return `${process.env.NEXT_PUBLIC_BASE_URL || 'https://outthegc.app'}/plus/${tripId}`
    }

    return `${window.location.origin}/plus/${tripId}`
  }, [tripId])

  const startCheckout = useCallback(async () => {
    if (!ownerToken) {
      setCheckoutError('Open this page from the browser session that created the trip to buy OutTheGC Plus.')
      return
    }

    if (!billingEmail.trim()) {
      setCheckoutError('Enter an email for the Stripe receipt.')
      return
    }

    setIsStartingCheckout(true)
    setCheckoutError(null)

    try {
      const returnUrl = new URL(window.location.href)
      returnUrl.searchParams.delete('session_id')
      returnUrl.searchParams.delete('paid')
      returnUrl.searchParams.delete('checkout')

      const response = await fetch(`/api/trips/${tripId}/billing/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-trip-owner-token': ownerToken,
        },
        body: JSON.stringify({ email: billingEmail.trim(), returnUrl: returnUrl.toString() }),
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
  }, [billingEmail, ownerToken, tripId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <Card className="border-border/60 bg-card p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-foreground">Loading OutTheGC Plus...</p>
          </Card>
        </div>
      </div>
    )
  }

  if (loadError || !data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <Card className="border-border/60 bg-card p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-foreground">Could not load this page</p>
            <p className="mt-2 text-sm text-muted-foreground">{loadError || 'Trip not found.'}</p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <EventTopBar
          tripId={tripId}
          tripName={data.trip.name}
          dateRange={formatDateRange(parseStoredDate(data.trip.startDate), parseStoredDate(data.trip.endDate))}
          responseCount={data.trip.responses.length}
          shareUrl={shareUrl}
          activeTab="plan"
          plusHref={`/plus/${tripId}`}
        />

        <section className="rounded-[32px] border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-orange-500/10 p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">OutTheGC Plus</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">$5 one-time payment</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Keep the planning page clean. Buy Plus once for this trip to unlock AI cleanup and final-doc organization.
          </p>
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          <ComparisonCard
            title="Free"
            accent="border-border/60 bg-card"
            items={[
              'Shared planning doc',
              'Manual notes and edits',
              'Results, dates, and destination locking',
              'Editable final doc',
            ]}
          />
          <ComparisonCard
            title="OutTheGC Plus"
            accent="border-primary/30 bg-primary/5"
            items={[
              'Everything in Free',
              'AI cleanup for trip planning notes',
              'One-click final doc organization',
              'Single $5 payment for this trip',
            ]}
          />
        </div>

        <Card className="border-border/60 bg-card shadow-sm">
          <CardContent className="space-y-5 p-6">
            {data.billing.hasPlusAccess ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-emerald-500/15 p-2 text-emerald-700">
                    <Check className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">OutTheGC Plus unlocked</p>
                    <p className="text-sm text-muted-foreground">This trip already has AI features enabled.</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
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
                  />
                </div>

                <Button
                  onClick={() => void startCheckout()}
                  disabled={isStartingCheckout || isVerifyingCheckout || !data.billing.stripeConfigured || !ownerToken}
                >
                  {isStartingCheckout ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Buy OutTheGC Plus for ${data.billing.priceUsd}
                </Button>
              </>
            )}

            {checkoutMessage && <p className="text-sm text-foreground">{checkoutMessage}</p>}
            {checkoutError && <p className="text-sm text-destructive">{checkoutError}</p>}
            {!data.billing.stripeConfigured && (
              <p className="text-sm text-destructive">Stripe still needs to be configured before checkout can work.</p>
            )}
            {!ownerToken && (
              <p className="text-sm text-muted-foreground">
                This checkout only works from the same browser session that created the trip.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ComparisonCard({
  title,
  items,
  accent,
}: {
  title: string
  items: string[]
  accent: string
}) {
  return (
    <div className={`rounded-[28px] border p-6 shadow-sm ${accent}`}>
      <p className="text-2xl font-semibold text-foreground">{title}</p>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3">
            <span className="mt-2 size-2 shrink-0 rounded-full bg-primary/70" />
            <p className="text-sm leading-6 text-muted-foreground">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
