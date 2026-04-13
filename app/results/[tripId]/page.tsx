'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Calendar, DollarSign, Heart, Loader2, MapPin, MessageSquare, Users } from 'lucide-react'
import { EventTopBar } from '@/components/tripsync/event-top-bar'
import { BestTripOption } from '@/components/tripsync/best-trip-option'
import { AvailabilityHeatmap } from '@/components/tripsync/availability-heatmap'
import { EventSummaryPanel } from '@/components/tripsync/event-summary-panel'
import { parseStoredDate, toDateOnlyString } from '@/lib/date-utils'
import { getBestDateWindows, getTripLengthDays } from '@/lib/availability'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import type { PublicResponseRecord, TripPlanPageData, TripPlanRecord, TripWithResponses } from '@/lib/trip-types'

interface ParticipantData {
  id: string
  name: string
  availability: { from: Date; to: Date } | null
  unavailableRanges: Array<{ from: Date; to: Date }>
  destinations: string[]
  budget: string
  interests: string[]
  notes: string
  submittedAt: Date
}

interface TripResponsePayload {
  trip?: TripWithResponses
  error?: string
}
interface PlanPayload extends Partial<TripPlanPageData> {
  error?: string
}

const BUDGET_LABELS: Record<string, string> = {
  budget: 'Budget ($)',
  moderate: 'Moderate ($$)',
  comfortable: 'Comfortable ($$$)',
  luxury: 'Luxury ($$$$)',
}

const INTEREST_LABELS: Record<string, string> = {
  beach: 'Beach',
  mountains: 'Mountains',
  city: 'City',
  culture: 'Culture',
  food: 'Food & Dining',
  adventure: 'Adventure',
  nightlife: 'Nightlife',
  nature: 'Nature',
  shopping: 'Shopping',
  relaxation: 'Relaxation',
  wellness: 'Wellness & Spa',
  museums: 'Museums & History',
  music: 'Live Music',
  roadtrip: 'Road Trip',
  photography: 'Scenic Views',
  sports: 'Sports & Games',
}

function responseToParticipant(response: PublicResponseRecord): ParticipantData {
  return {
    id: response.id,
    name: response.name,
    availability:
      response.availabilityStart && response.availabilityEnd
        ? {
            from: parseStoredDate(response.availabilityStart),
            to: parseStoredDate(response.availabilityEnd),
          }
        : null,
    unavailableRanges: response.unavailableRanges.map((range) => ({
      from: parseStoredDate(range.startDate),
      to: parseStoredDate(range.endDate),
    })),
    destinations: response.destinations,
    budget: response.budget,
    interests: response.interests,
    notes: response.notes,
    submittedAt: new Date(response.submittedAt),
  }
}

function formatDateRange(from: Date, to: Date) {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  return `${from.toLocaleDateString('en-US', options)} - ${to.toLocaleDateString('en-US', options)}`
}

// Generate initials avatar color from name
function getAvatarColor(name: string) {
  const colors = [
    'bg-primary/20 text-primary',
    'bg-accent/20 text-accent',
    'bg-emerald-500/20 text-emerald-700',
    'bg-amber-500/20 text-amber-700',
    'bg-rose-500/20 text-rose-700',
    'bg-sky-500/20 text-sky-700',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function ResultsPage() {
  const params = useParams()
  const tripId = params.tripId as string
  const [trip, setTrip] = useState<TripWithResponses | null>(null)
  const [participants, setParticipants] = useState<ParticipantData[]>([])
  const [plan, setPlan] = useState<TripPlanRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null)
  const [tripDurationDays, setTripDurationDays] = useState(4)
  const hasInitializedTripLength = useRef(false)
  const [isApplyingSelection, setIsApplyingSelection] = useState(false)
  const [applyMessage, setApplyMessage] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)

  const loadTrip = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const [tripResponse, planResponse] = await Promise.all([
        fetch(`/api/trips/${tripId}`, { cache: 'no-store' }),
        fetch(`/api/trips/${tripId}/plan`, { cache: 'no-store' }),
      ])
      const tripData = (await tripResponse.json()) as TripResponsePayload
      const planData = (await planResponse.json()) as PlanPayload

      if (!tripResponse.ok || !tripData.trip) {
        throw new Error(tripData.error || 'Unable to load trip results.')
      }

      setTrip(tripData.trip)
      const nextParticipants = tripData.trip.responses.map(responseToParticipant)
      setParticipants(nextParticipants)
      setSelectedParticipantId((current) =>
        current && nextParticipants.some((participant) => participant.id === current) ? current : null,
      )
      setPlan(planResponse.ok && planData.plan ? planData.plan : null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load trip results.')
    } finally {
      setIsLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    void loadTrip()
  }, [loadTrip])

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return `${process.env.NEXT_PUBLIC_BASE_URL || 'https://outthegc.app'}/results/${tripId}`
    }
    return `${window.location.origin}/results/${tripId}`
  }, [tripId])

  const destinationCounts = useMemo(
    () =>
      participants.reduce((acc, participant) => {
        participant.destinations.forEach((destination) => {
          acc[destination] = (acc[destination] || 0) + 1
        })
        return acc
      }, {} as Record<string, number>),
    [participants],
  )

  const sortedDestinations = useMemo(
    () => Object.entries(destinationCounts).sort(([, a], [, b]) => b - a).slice(0, 6),
    [destinationCounts],
  )

  const budgetCounts = useMemo(
    () =>
      participants.reduce((acc, participant) => {
        if (participant.budget) {
          acc[participant.budget] = (acc[participant.budget] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>),
    [participants],
  )

  const interestCounts = useMemo(
    () =>
      participants.reduce((acc, participant) => {
        participant.interests.forEach((interest) => {
          acc[interest] = (acc[interest] || 0) + 1
        })
        return acc
      }, {} as Record<string, number>),
    [participants],
  )

  const sortedInterests = useMemo(
    () => Object.entries(interestCounts).sort(([, a], [, b]) => b - a).slice(0, 10),
    [interestCounts],
  )

  const participantNotes = useMemo(
    () => participants.filter((participant) => participant.notes.trim()),
    [participants],
  )

  const bestWindows = useMemo(() => {
    if (!trip) return null
    return getBestDateWindows(
      trip.responses,
      { startDate: trip.startDate, endDate: trip.endDate },
      tripDurationDays,
    )
  }, [participants, trip, tripDurationDays])
  const bestWindow = bestWindows?.[0] ?? null

  const maxTripDuration = useMemo(() => {
    if (!trip) return 30
    return Math.min(30, getTripLengthDays(trip.startDate, trip.endDate))
  }, [trip])

  useEffect(() => {
    setTripDurationDays((current) => Math.min(current, maxTripDuration))
  }, [maxTripDuration])

  useEffect(() => {
    if (!trip || hasInitializedTripLength.current) return

    if (plan?.finalStartDate && plan?.finalEndDate) {
      setTripDurationDays(getTripLengthDays(plan.finalStartDate, plan.finalEndDate))
    } else {
      setTripDurationDays(Math.min(4, maxTripDuration))
    }

    hasInitializedTripLength.current = true
  }, [maxTripDuration, plan?.finalEndDate, plan?.finalStartDate, trip])

  const currentPlanWindowKey = useMemo(() => {
    if (!plan?.finalStartDate || !plan.finalEndDate) return null
    return `${toDateOnlyString(parseStoredDate(plan.finalStartDate))}-${toDateOnlyString(parseStoredDate(plan.finalEndDate))}`
  }, [plan?.finalEndDate, plan?.finalStartDate])

  const savePlanSelection = useCallback(
    async (input: Partial<TripPlanRecord>) => {
      setIsApplyingSelection(true)
      setApplyError(null)
      setApplyMessage(null)

      try {
        const response = await fetch(`/api/trips/${tripId}/plan`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        })
        const payload = (await response.json()) as { plan?: TripPlanRecord; error?: string }

        if (!response.ok || !payload.plan) {
          throw new Error(payload.error || 'Unable to save this plan selection.')
        }

        setPlan(payload.plan)
        setApplyMessage('Plan updated.')
      } catch (error) {
        setApplyError(error instanceof Error ? error.message : 'Unable to save this plan selection.')
      } finally {
        setIsApplyingSelection(false)
      }
    },
    [tripId],
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
            <h1 className="mb-2 text-2xl font-bold text-foreground">Loading results...</h1>
            <p className="text-sm text-muted-foreground">Pulling together the group picture.</p>
          </div>
        </div>
      </div>
    )
  }

  if (loadError || !trip) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-10 text-center shadow-sm">
            <h1 className="mb-2 text-2xl font-bold text-foreground">Results not found</h1>
            <p className="text-sm text-muted-foreground">{loadError || 'This results page does not exist.'}</p>
          </div>
        </div>
      </div>
    )
  }

  const bestDateLabel = bestWindow
    ? `${parseStoredDate(bestWindow.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${parseStoredDate(bestWindow.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : null

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <EventTopBar
          tripId={tripId}
          tripName={trip.name}
          dateRange={formatDateRange(parseStoredDate(trip.startDate), parseStoredDate(trip.endDate))}
          responseCount={participants.length}
          shareUrl={shareUrl}
          activeTab="results"
          plusHref={`/plus/${tripId}`}
        />

        {/* Featured section: Best Trip Option */}
        {bestWindow && sortedDestinations.length > 0 && (
          <BestTripOption
            bestDates={bestDateLabel || '—'}
            peopleCount={bestWindow.minAvailable}
            topDestinations={sortedDestinations.map(([dest]) => dest)}
          />
        )}

        {/* Hero stats — 3 big numbers */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Best Dates — primary featured stat */}
          <div className="sm:col-span-1 rounded-2xl border border-primary/20 bg-primary/8 p-5 flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Best dates</p>
            <p className="text-2xl font-bold text-foreground leading-tight">
              {bestDateLabel ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {bestWindow
                ? `${bestWindow.minAvailable}/${participants.length} people free · ${tripDurationDays}-day trip`
                : 'Waiting on more responses'}
            </p>
            {bestWindow && (
              <div className="pt-2">
                <Button
                  size="sm"
                  variant={currentPlanWindowKey === `${bestWindow.startDate}-${bestWindow.endDate}` ? 'default' : 'outline'}
                  onClick={() =>
                    void savePlanSelection({
                      finalStartDate: bestWindow.startDate,
                      finalEndDate: bestWindow.endDate,
                    })
                  }
                  disabled={isApplyingSelection}
                >
                  {isApplyingSelection ? <Loader2 className="size-4 animate-spin" /> : null}
                  {currentPlanWindowKey === `${bestWindow.startDate}-${bestWindow.endDate}` ? 'Selected in Plan' : 'Use these dates in Plan'}
                </Button>
              </div>
            )}
          </div>
          {/* Top destination */}
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top destination</p>
            <p className="text-2xl font-bold text-foreground leading-tight">
              {sortedDestinations[0]?.[0] ?? '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {sortedDestinations[0]?.[1] != null
                ? `${sortedDestinations[0][1]} of ${participants.length} votes`
                : 'No picks yet'}
            </p>
            {sortedDestinations[0] && (
              <div className="pt-2">
                <Button
                  size="sm"
                  variant={plan?.finalDestination === sortedDestinations[0][0] ? 'default' : 'outline'}
                  onClick={() => void savePlanSelection({ finalDestination: sortedDestinations[0][0] })}
                  disabled={isApplyingSelection}
                >
                  {plan?.finalDestination === sortedDestinations[0][0] ? 'Selected in Plan' : 'Use this destination in Plan'}
                </Button>
              </div>
            )}
          </div>
          {/* Group size */}
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Responses in</p>
            <p className="text-2xl font-bold text-foreground leading-tight">{participants.length}</p>
            <p className="text-xs text-muted-foreground">
              {participants.length === 0
                ? 'No one yet'
                : participants.length === 1
                  ? '1 person responded'
                  : `${participants.length} people responded`}
            </p>
          </div>
        </div>

        {/* Trip length slider */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-baseline gap-2 mb-3">
            <Calendar className="size-4 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <p className="text-sm font-semibold text-foreground">Trip length</p>
                <span className="text-2xl font-bold text-primary">{tripDurationDays}</span>
                <span className="text-xs text-muted-foreground">day{tripDurationDays === 1 ? '' : 's'}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Drag to adjust — the best date window updates above.
              </p>
            </div>
          </div>
          <Slider
            value={[tripDurationDays]}
            onValueChange={(value) => setTripDurationDays(value[0])}
            min={1}
            max={maxTripDuration}
            step={1}
            className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-2 [&_[role=slider]]:border-primary-foreground"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>1 day</span>
            <span>{maxTripDuration} days</span>
          </div>
        </div>

        {/* Availability heatmap */}
        <AvailabilityHeatmap
          participants={participants}
          tripDateRange={{ from: parseStoredDate(trip.startDate), to: parseStoredDate(trip.endDate) }}
          tripDurationDays={tripDurationDays}
          onApplyWindow={(window) =>
            void savePlanSelection({
              finalStartDate: toDateOnlyString(window.start),
              finalEndDate: toDateOnlyString(window.end),
            })
          }
          appliedWindowKey={currentPlanWindowKey}
        />

        {(applyMessage || applyError) && (
          <div className="rounded-2xl border border-border bg-card px-4 py-3">
            {applyMessage && <p className="text-sm text-foreground">{applyMessage}</p>}
            {applyError && <p className="text-sm text-destructive">{applyError}</p>}
          </div>
        )}

        {/* Destination votes + budget + vibe — editorial 3-col */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Destinations — wider primary section */}
          <div className="lg:col-span-1 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="size-4 text-primary shrink-0" />
              <p className="text-sm font-semibold text-foreground">Destination votes</p>
            </div>
            {sortedDestinations.length === 0 ? (
              <p className="text-xs text-muted-foreground">No picks yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {sortedDestinations.map(([destination, count], index) => (
                  <div key={destination} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        {index === 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block shrink-0" />
                        )}
                        {destination}
                      </span>
                      <span className="text-xs font-semibold text-primary shrink-0">
                        {count}/{participants.length}
                      </span>
                    </div>
                    <Progress
                      value={(count / Math.max(1, participants.length)) * 100}
                      className="h-1.5 rounded-full"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Budget */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="size-4 text-primary shrink-0" />
              <p className="text-sm font-semibold text-foreground">Budget breakdown</p>
            </div>
            {Object.keys(budgetCounts).length === 0 ? (
              <p className="text-xs text-muted-foreground">No budget responses yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {Object.entries(budgetCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([budget, count]) => (
                    <div key={budget} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{BUDGET_LABELS[budget] || budget}</span>
                      <span className="text-xs font-semibold text-muted-foreground">
                        {count} {count === 1 ? 'person' : 'people'}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Vibe */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="size-4 text-primary shrink-0" />
              <p className="text-sm font-semibold text-foreground">Group vibe</p>
            </div>
            {sortedInterests.length === 0 ? (
              <p className="text-xs text-muted-foreground">No activity preferences yet.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {sortedInterests.map(([interest, count]) => (
                  <Badge
                    key={interest}
                    variant="outline"
                    className="gap-1 text-xs font-medium bg-primary/6 text-primary border-primary/20 hover:bg-primary/12 transition-colors duration-150"
                  >
                    {INTEREST_LABELS[interest] || interest}
                    <span className="font-bold">{count}</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Participant notes */}
        {participantNotes.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="size-4 text-primary shrink-0" />
              <p className="text-sm font-semibold text-foreground">Notes from the group</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {participantNotes.map((participant) => (
                <div
                  key={participant.id}
                  className="rounded-xl border border-border/60 bg-muted/30 p-4 transition-shadow duration-150 hover:shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div
                      className={`size-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${getAvatarColor(participant.name)}`}
                    >
                      {getInitials(participant.name)}
                    </div>
                    <p className="text-sm font-semibold text-foreground">{participant.name}</p>
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{participant.notes}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <EventSummaryPanel
          participants={participants}
          selectedParticipantId={selectedParticipantId}
          onSelectParticipant={setSelectedParticipantId}
          currentUserId={null}
          onEditParticipant={() => undefined}
        />
      </div>
    </div>
  )
}
