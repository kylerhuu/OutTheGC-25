'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { EventTopBar } from '@/components/tripsync/event-top-bar'
import { FinalDocTab } from '@/components/tripsync/final-doc-tab'
import { TripSnapshot } from '@/components/tripsync/trip-snapshot'
import { getBestAvailabilitySpans, getBestDateWindows, getTripLengthDays } from '@/lib/availability'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { buildFinalDocContent } from '@/lib/final-doc'
import { parseStoredDate } from '@/lib/date-utils'
import type { TripPlanPageData, TripPlanRecord, UpdateTripPlanInput } from '@/lib/trip-types'

interface PlanPayload extends Partial<TripPlanPageData> {
  error?: string
}

interface PlanSavePayload {
  plan?: TripPlanRecord
  error?: string
  usedFallback?: boolean
  code?: string
}

const SECTION_PLACEHOLDERS = {
  housingNotes: 'Hotels, Airbnbs, neighborhoods, room setup, price ideas...',
  attractionNotes: 'Places to visit, museums, parks, landmarks, scenic spots...',
  foodNotes: 'Restaurants, cafes, dessert spots, local dishes to try...',
  activityNotes: 'Fun things to do, nightlife, shopping, hiking, beach time...',
  dayPlanNotes: 'Day 1 ideas, possible order of activities, rough schedule...',
  transportationNotes: 'Flights, trains, driving, transfers, local transport...',
  bookingNotes: 'Things that still need reservations, tickets, or booking reminders...',
  otherNotes: 'Anything else the group wants to remember or think through...',
}

const DOC_SECTIONS: Array<{
  key: keyof UpdateTripPlanInput
  title: string
  description: string
}> = [
  { key: 'housingNotes', title: 'Housing', description: 'Where you might stay and what kind of place fits the trip.' },
  { key: 'attractionNotes', title: 'Attractions', description: 'Main places worth visiting.' },
  { key: 'foodNotes', title: 'Food Spots', description: 'Restaurants, cafes, desserts, and food ideas.' },
  { key: 'activityNotes', title: 'Fun Things To Do', description: 'Anything fun, social, relaxing, or memorable.' },
  { key: 'dayPlanNotes', title: 'Possible Day Plan', description: 'A rough day-by-day flow if you want one.' },
  { key: 'transportationNotes', title: 'Transportation', description: 'How you are getting there and moving around.' },
  { key: 'bookingNotes', title: 'Things To Book', description: 'Tickets, lodging, tours, and anything time-sensitive.' },
  { key: 'otherNotes', title: 'Other Notes', description: 'Loose thoughts, reminders, and open questions.' },
]

function formatDateRange(from: Date, to: Date) {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  return `${from.toLocaleDateString('en-US', options)} - ${to.toLocaleDateString('en-US', options)}`
}

export default function PlanPage() {
  const params = useParams()
  const tripId = params.tripId as string
  const [data, setData] = useState<TripPlanPageData | null>(null)
  const [draft, setDraft] = useState<UpdateTripPlanInput | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [activePlannerTab, setActivePlannerTab] = useState<'plan' | 'final-doc'>('plan')
  const [isOrganizing, setIsOrganizing] = useState(false)
  const [tripLengthDays, setTripLengthDays] = useState(4)

  const loadPlan = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const response = await fetch(`/api/trips/${tripId}/plan`, { cache: 'no-store' })
      const payload = (await response.json()) as PlanPayload

      if (!response.ok || !payload.trip || !payload.plan || !payload.suggestions || !payload.billing) {
        throw new Error(payload.error || 'Unable to load planning board.')
      }

      setData({
        trip: payload.trip,
        plan: payload.plan,
        suggestions: payload.suggestions,
        billing: payload.billing,
      })
      setDraft({
        finalDestination: payload.plan.finalDestination,
        finalStartDate: payload.plan.finalStartDate,
        finalEndDate: payload.plan.finalEndDate,
        housingNotes: payload.plan.housingNotes,
        attractionNotes: payload.plan.attractionNotes,
        foodNotes: payload.plan.foodNotes,
        activityNotes: payload.plan.activityNotes,
        dayPlanNotes: payload.plan.dayPlanNotes,
        transportationNotes: payload.plan.transportationNotes,
        bookingNotes: payload.plan.bookingNotes,
        otherNotes: payload.plan.otherNotes,
        finalDocContent:
          payload.plan.finalDocContent || buildFinalDocContent(payload.trip, payload.plan),
      })
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load planning board.')
    } finally {
      setIsLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    void loadPlan()
  }, [loadPlan])

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return `${process.env.NEXT_PUBLIC_BASE_URL || 'https://outthegc.app'}/plan/${tripId}`
    }

    return `${window.location.origin}/plan/${tripId}`
  }, [tripId])

  const suggestions = useMemo(() => {
    if (!data) return null

    return {
      topDestinations: data.suggestions.topDestinations.slice(0, 4),
    }
  }, [data])

  const maxTripLengthDays = useMemo(() => {
    if (!data) return 30
    return Math.min(30, getTripLengthDays(data.trip.startDate, data.trip.endDate))
  }, [data])

  useEffect(() => {
    if (!data) return
    if (draft?.finalStartDate && draft.finalEndDate) {
      setTripLengthDays(getTripLengthDays(draft.finalStartDate, draft.finalEndDate))
      return
    }
    setTripLengthDays(Math.min(data.suggestions.suggestedDurationDays, maxTripLengthDays))
  }, [data, draft?.finalEndDate, draft?.finalStartDate, maxTripLengthDays])

  const suggestedWindows = useMemo(() => {
    if (!data) return []
    return getBestDateWindows(
      data.trip.responses,
      { startDate: data.trip.startDate, endDate: data.trip.endDate },
      tripLengthDays,
    )
  }, [data, tripLengthDays])

  const sharedAvailabilitySpans = useMemo(() => {
    if (!data) return []
    return getBestAvailabilitySpans(data.trip.responses, {
      startDate: data.trip.startDate,
      endDate: data.trip.endDate,
    })
  }, [data])

  const handleDraftChange = <K extends keyof UpdateTripPlanInput>(key: K, value: UpdateTripPlanInput[K]) => {
    setDraft((current) => ({
      ...(current || {}),
      [key]: value,
    }))
    setSaveMessage(null)
    setSaveError(null)
  }

  const savePlan = useCallback(
    async (nextDraft: UpdateTripPlanInput) => {
      setIsSaving(true)
      setSaveError(null)
      setSaveMessage(null)

      try {
        const response = await fetch(`/api/trips/${tripId}/plan`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(nextDraft),
        })

        const payload = (await response.json()) as PlanSavePayload

        if (!response.ok || !payload.plan) {
          throw new Error(payload.error || 'Unable to save plan.')
        }

        setData((current) => (current ? { ...current, plan: payload.plan! } : current))
        setDraft({
          finalDestination: payload.plan.finalDestination,
          finalStartDate: payload.plan.finalStartDate,
          finalEndDate: payload.plan.finalEndDate,
          housingNotes: payload.plan.housingNotes,
          attractionNotes: payload.plan.attractionNotes,
          foodNotes: payload.plan.foodNotes,
          activityNotes: payload.plan.activityNotes,
          dayPlanNotes: payload.plan.dayPlanNotes,
          transportationNotes: payload.plan.transportationNotes,
          bookingNotes: payload.plan.bookingNotes,
          otherNotes: payload.plan.otherNotes,
          finalDocContent:
            payload.plan.finalDocContent ||
            (data ? buildFinalDocContent(data.trip, payload.plan) : ''),
        })
        setSaveMessage('Plan saved.')
        return payload.plan
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to save plan.'
        setSaveError(message)
        throw new Error(message)
      } finally {
        setIsSaving(false)
      }
    },
    [data, tripId],
  )

  const handleSavePlan = async () => {
    if (!draft) return
    await savePlan(draft)
  }

  const handleOrganizeIntoFinalDoc = async () => {
    setIsOrganizing(true)
    setSaveError(null)
    try {
      const response = await fetch(`/api/trips/${tripId}/plan/organize`, {
        method: 'POST',
      })
      const payload = (await response.json()) as PlanSavePayload

      if (!response.ok || !payload.plan) {
        throw new Error(payload.error || 'Unable to organize final doc.')
      }

      setData((current) => (current ? { ...current, plan: payload.plan! } : current))
      setDraft((current) => ({
        ...(current || {}),
        finalDocContent: payload.plan!.finalDocContent,
      }))
      setActivePlannerTab('final-doc')
      setSaveMessage(payload.usedFallback ? 'Final doc organized with fallback formatting.' : 'Final doc organized.')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to organize final doc.')
    } finally {
      setIsOrganizing(false)
    }
  }

  const handleSaveFinalDoc = async (content: string) => {
    const nextDraft = {
      ...(draft || {}),
      finalDocContent: content,
    }
    await savePlan(nextDraft)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border/60 bg-card p-10 text-center shadow-sm">
            <h1 className="mb-2 text-2xl font-semibold text-foreground">Loading planning board...</h1>
            <p className="text-sm text-muted-foreground">Pulling together the trip decisions.</p>
          </div>
        </div>
      </div>
    )
  }

  if (loadError || !data || !draft) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border/60 bg-card p-10 text-center shadow-sm">
            <h1 className="mb-2 text-2xl font-semibold text-foreground">Plan not found</h1>
            <p className="text-sm text-muted-foreground">{loadError || 'This planning board does not exist.'}</p>
            <Button className="mt-6" onClick={() => void loadPlan()}>
              Retry
            </Button>
          </div>
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
        <div className="inline-flex w-fit items-center rounded-2xl border border-border bg-muted/40 p-1 shadow-sm">
          {(['plan', 'final-doc'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActivePlannerTab(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                activePlannerTab === tab
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
              }`}
            >
              {tab === 'plan' ? 'Plan' : 'Final Doc'}
            </button>
          ))}
        </div>

        {activePlannerTab === 'final-doc' ? (
          <FinalDocTab trip={data.trip} plan={data.plan} onSave={handleSaveFinalDoc} />
        ) : (
          <Card className="border-border/60 bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-foreground">Plan the trip</CardTitle>
              <CardDescription>
                Think of this like a shared trip doc. Jot ideas down under the headers, save over time, then organize it into a polished final doc.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-8">
              <TripSnapshot
                trip={data.trip}
                plan={{
                  ...data.plan,
                  finalDestination: draft.finalDestination || '',
                  finalStartDate: draft.finalStartDate || null,
                  finalEndDate: draft.finalEndDate || null,
                }}
                topDestinations={suggestions?.topDestinations}
                suggestedWindows={suggestedWindows}
                sharedAvailabilitySpans={sharedAvailabilitySpans}
                selectedTripLengthDays={tripLengthDays}
                maxTripLengthDays={maxTripLengthDays}
                onTripLengthChange={setTripLengthDays}
                onSelectDestination={(value) => handleDraftChange('finalDestination', value)}
                onSelectDates={(startDate, endDate) => {
                  handleDraftChange('finalStartDate', startDate)
                  handleDraftChange('finalEndDate', endDate)
                }}
              />

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/8 to-fuchsia-500/5 p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Working trip doc</p>
                  <p className="text-sm text-muted-foreground">
                    Keep rough notes here while the group is figuring things out. When it feels ready, organize it into the Final Doc.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void handleSavePlan()} disabled={isSaving}>
                    {isSaving ? <Spinner className="size-4" /> : 'Save notes'}
                  </Button>
                  {data.billing.hasPlusAccess ? (
                    <Button onClick={() => void handleOrganizeIntoFinalDoc()} disabled={isOrganizing}>
                      {isOrganizing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                      Organize into Final Doc
                    </Button>
                  ) : (
                    <Button asChild>
                      <a href={`/plus/${tripId}`}>
                        <Sparkles className="size-4" />
                        Unlock AI with OutTheGC+
                      </a>
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-8">
                {DOC_SECTIONS.map((section) => (
                  <section key={section.key} className="space-y-3 border-b border-border/50 pb-6 last:border-b-0 last:pb-0">
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">{section.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                    </div>
                    <Textarea
                      value={(draft[section.key] as string) || ''}
                      onChange={(event) => handleDraftChange(section.key, event.target.value)}
                      placeholder={SECTION_PLACEHOLDERS[section.key as keyof typeof SECTION_PLACEHOLDERS]}
                      className="min-h-[160px] resize-none border-none bg-transparent px-0 text-base leading-7 shadow-none focus-visible:ring-0"
                    />
                  </section>
                ))}
              </div>

              {(saveMessage || saveError) && (
                <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                  {saveMessage && <p className="text-sm text-foreground">{saveMessage}</p>}
                  {saveError && <p className="text-sm text-destructive">{saveError}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
