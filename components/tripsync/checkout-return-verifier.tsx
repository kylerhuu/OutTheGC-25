'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from '@/hooks/use-toast'

interface CheckoutReturnVerifierProps {
  tripId: string
  onVerified?: () => void | Promise<void>
}

export function CheckoutReturnVerifier({ tripId, onVerified }: CheckoutReturnVerifierProps) {
  const searchParams = useSearchParams()

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    const paidFlag = searchParams.get('paid')
    const canceled = searchParams.get('checkout')

    if (canceled === 'canceled') {
      toast({
        title: 'Checkout canceled',
        description: 'No charge was made.',
      })
      const nextUrl = new URL(window.location.href)
      nextUrl.searchParams.delete('checkout')
      window.history.replaceState({}, '', nextUrl.toString())
      return
    }

    if (!sessionId || paidFlag !== 'true') {
      return
    }

    const verifiedSessionId = sessionId
    let isActive = true

    async function verifyCheckoutSession() {
      try {
        const response = await fetch(
          `/api/trips/${tripId}/billing/verify-session?session_id=${encodeURIComponent(verifiedSessionId)}`,
          { cache: 'no-store' },
        )
        const payload = (await response.json()) as { paid?: boolean; error?: string }

        if (!response.ok) {
          throw new Error(payload.error || 'Unable to verify payment.')
        }

        if (!isActive) return

        if (payload.paid) {
          await onVerified?.()
          toast({
            title: 'OutTheGC Plus unlocked',
            description: 'AI organization is ready for this event.',
          })
        } else {
          toast({
            title: 'Payment pending',
            description: 'Stripe is still confirming the payment. Refresh in a moment.',
          })
        }
      } catch (error) {
        if (!isActive) return
        toast({
          title: 'Could not verify payment',
          description: error instanceof Error ? error.message : 'Please try again.',
        })
      } finally {
        if (isActive) {
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
  }, [onVerified, searchParams, tripId])

  return null
}
