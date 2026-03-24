'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Calendar, DollarSign, Heart, MapPin, MessageSquare, Users } from 'lucide-react'
import { EventTopBar } from '@/components/tripsync/event-top-bar'
import { AvailabilityHeatmap } from '@/components/tripsync/availability-heatmap'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import type { PublicResponseRecord, TripWithResponses } from '@/lib/trip-types'

interface ParticipantData {
  id: string
  name: string
  availability: { from: Date; to: Date } | null
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
            from: new Date(response.availabilityStart),
            to: new Date(response.availabilityEnd),
          }
        : null,
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

function getBestWindow(participants: ParticipantData[], tripDateRange: { from: Date; to: Date }) {
  const days: Array<{ date: Date; count: number }> = []
  const currentDate = new Date(tripDateRange.from)
  const endDate = new Date(tripDateRange.to)
  const duration = Math.min(
    4,
    Math.max(1, Math.floor((endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)) + 1),
  )

  while (currentDate <= endDate) {
    const dayStart = new Date(currentDate)
    dayStart.setHours(0, 0, 0, 0)

    const availableCount = participants.filter((participant) => {
      if (!participant.availability) return false
      const availableFrom = new Date(participant.availability.from)
      const availableTo = new Date(participant.availability.to)
      availableFrom.setHours(0, 0, 0, 0)
      availableTo.setHours(23, 59, 59, 999)
      return dayStart >= availableFrom && dayStart <= availableTo
    }).length

    days.push({ date: new Date(currentDate), count: availableCount })
    currentDate.setDate(currentDate.getDate() + 1)
  }

  if (participants.length === 0 || days.length < duration) {
    return null
  }

  let best: { start: Date; end: Date; average: number } | null = null

  for (let index = 0; index <= days.length - duration; index += 1) {
    const slice = days.slice(index, index + duration)
    const average = slice.reduce((sum, day) => sum + day.count, 0) / slice.length

    if (!best || average > best.average) {
      best = {
        start: slice[0].date,
        end: slice[slice.length - 1].date,
        average,
      }
    }
  }

  return best
}

export default function ResultsPage() {
  const params = useParams()
  const tripId = params.tripId as string
  const [trip, setTrip] = useState<TripWithResponses | null>(null)
  const [participants, setParticipants] = useState<ParticipantData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadTrip = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const response = await fetch(`/api/trips/${tripId}`, { cache: 'no-store' })
      const data = (await response.json()) as TripResponsePayload

      if (!response.ok || !data.trip) {
        throw new Error(data.error || 'Unable to load trip results.')
      }

      setTrip(data.trip)
      setParticipants(data.trip.responses.map(responseToParticipant))
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

  const bestWindow = useMemo(() => {
    if (!trip) return null
    return getBestWindow(participants, {
      from: new Date(trip.startDate),
      to: new Date(trip.endDate),
    })
  }, [participants, trip])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border/60 bg-card p-10 text-center shadow-sm">
            <h1 className="mb-2 text-2xl font-semibold text-foreground">Loading results...</h1>
            <p className="text-sm text-muted-foreground">Pulling together the group picture.</p>
          </div>
        </div>
      </div>
    )
  }

  if (loadError || !trip) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border/60 bg-card p-10 text-center shadow-sm">
            <h1 className="mb-2 text-2xl font-semibold text-foreground">Results not found</h1>
            <p className="text-sm text-muted-foreground">{loadError || 'This results page does not exist.'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <EventTopBar
          tripId={tripId}
          tripName={trip.name}
          dateRange={formatDateRange(new Date(trip.startDate), new Date(trip.endDate))}
          responseCount={participants.length}
          shareUrl={shareUrl}
          activeTab="results"
        />

        <Card className="border-border/60 bg-card shadow-sm">
          <CardContent className="grid gap-4 p-6 md:grid-cols-3">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top destination</p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {sortedDestinations[0]?.[0] || 'Still deciding'}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Best dates</p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {bestWindow
                  ? `${bestWindow.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${bestWindow.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  : 'Waiting on more responses'}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Group size</p>
              <p className="mt-2 text-xl font-semibold text-foreground">
                {participants.length} {participants.length === 1 ? 'response' : 'responses'}
              </p>
            </div>
          </CardContent>
        </Card>

        <AvailabilityHeatmap
          participants={participants}
          tripDateRange={{ from: new Date(trip.startDate), to: new Date(trip.endDate) }}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border/60 bg-card shadow-sm">
            <CardHeader className="pb-3.5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="size-4 text-primary" />
                Destination votes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {sortedDestinations.length === 0 ? (
                <p className="text-xs text-muted-foreground">No destination picks yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {sortedDestinations.map(([destination, count]) => (
                    <div key={destination} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">{destination}</span>
                        <span className="text-xs font-medium text-primary">{count} vote{count === 1 ? '' : 's'}</span>
                      </div>
                      <Progress value={(count / participants.length) * 100} className="h-2 rounded-full" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card shadow-sm">
            <CardHeader className="pb-3.5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <DollarSign className="size-4 text-primary" />
                Budget breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {Object.keys(budgetCounts).length === 0 ? (
                <p className="text-xs text-muted-foreground">No budget responses yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(budgetCounts).map(([budget, count]) => (
                    <Badge key={budget} variant="secondary" className="text-xs font-medium">
                      {BUDGET_LABELS[budget] || budget} · {count}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card shadow-sm">
            <CardHeader className="pb-3.5">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Heart className="size-4 text-primary" />
                Group vibe
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {sortedInterests.length === 0 ? (
                <p className="text-xs text-muted-foreground">No activity preferences yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sortedInterests.map(([interest, count]) => (
                    <Badge key={interest} variant="outline" className="gap-1.5 text-xs font-medium bg-primary/5 text-primary border-primary/20">
                      {INTEREST_LABELS[interest] || interest}
                      <span className="font-semibold">{count}</span>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-3.5">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MessageSquare className="size-4 text-primary" />
              Participant notes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {participantNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No extra notes yet.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {participantNotes.map((participant) => (
                  <div key={participant.id} className="rounded-xl border border-border/60 bg-muted/20 p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{participant.name}</p>
                      <Badge variant="outline" className="text-xs font-medium">
                        {participant.submittedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Badge>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{participant.notes}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-3.5">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users className="size-4 text-primary" />
              Who responded
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {participants.map((participant) => (
                <Badge key={participant.id} variant="secondary" className="text-xs font-medium">
                  {participant.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
