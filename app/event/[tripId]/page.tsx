'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import type { DateRange } from 'react-day-picker'
import { EventTopBar } from '@/components/tripsync/event-top-bar'
import { EventInputPanel } from '@/components/tripsync/event-input-panel'
import { EventSummaryPanel } from '@/components/tripsync/event-summary-panel'
import type { CreateResponseInput, PublicResponseRecord, ResponseRecord, TripWithResponses } from '@/lib/trip-types'

export interface ParticipantData {
  id: string
  name: string
  availability: { from: Date; to: Date } | null
  destinations: string[]
  budget: string
  interests: string[]
  notes: string
  submittedAt: Date
}

interface TripAccess {
  responseId: string
  editCode: string
}

interface TripResponsePayload {
  trip?: TripWithResponses
  error?: string
}

interface SaveResponsePayload {
  response?: ResponseRecord
  error?: string
}

function getDestinationOptions(destinationOptions: string[]) {
  const defaults = [
    'Barcelona',
    'Lisbon',
    'Tokyo',
    'Bali',
    'Iceland',
    'Costa Rica',
    'Portugal',
    'Greece',
  ]

  const seen = new Set<string>()
  const merged: string[] = []

  for (const destination of [...defaults, ...destinationOptions]) {
    const trimmed = destination.trim().replace(/\s+/g, ' ')
    const normalized = trimmed.toLowerCase()
    if (!trimmed || seen.has(normalized)) continue
    seen.add(normalized)
    merged.push(trimmed)
  }

  return merged
}

function getTripAccessKey(tripId: string) {
  return `outthegc:trip-access:${tripId}`
}

function responseToParticipant(response: PublicResponseRecord | ResponseRecord): ParticipantData {
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

export default function EventPage() {
  const params = useParams()
  const tripId = params.tripId as string
  const [trip, setTrip] = useState<TripWithResponses | null>(null)
  const [participants, setParticipants] = useState<ParticipantData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [tripAccess, setTripAccess] = useState<TripAccess | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null)
  const [editingParticipant, setEditingParticipant] = useState<ParticipantData | null>(null)
  const [savedEditCode, setSavedEditCode] = useState<string | null>(null)
  const availabilitySectionRef = useRef<HTMLDivElement>(null)

  const loadTrip = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const response = await fetch(`/api/trips/${tripId}`, { cache: 'no-store' })
      const data = (await response.json()) as TripResponsePayload

      if (!response.ok || !data.trip) {
        throw new Error(data.error || 'Unable to load trip.')
      }

      setTrip(data.trip)

      const nextParticipants = data.trip.responses.map(responseToParticipant)
      setParticipants(nextParticipants)

      const storedAccessRaw = window.localStorage.getItem(getTripAccessKey(tripId))
      let storedAccess: TripAccess | null = null

      if (storedAccessRaw) {
        try {
          storedAccess = JSON.parse(storedAccessRaw) as TripAccess
        } catch {
          window.localStorage.removeItem(getTripAccessKey(tripId))
        }
      }

      const matchedParticipant = storedAccess
        ? nextParticipants.find((participant) => participant.id === storedAccess.responseId)
        : null

      if (matchedParticipant && storedAccess) {
        setTripAccess(storedAccess)
        setCurrentUserId(matchedParticipant.id)
        setHasSubmitted(true)
        setSavedEditCode(storedAccess.editCode)
        setSelectedParticipantId(matchedParticipant.id)
      } else {
        if (storedAccessRaw) {
          window.localStorage.removeItem(getTripAccessKey(tripId))
        }
        setTripAccess(null)
        setCurrentUserId(null)
        setHasSubmitted(false)
        setSavedEditCode(null)
        setEditingParticipant(null)
        setSelectedParticipantId(nextParticipants[0]?.id ?? null)
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load trip.')
    } finally {
      setIsLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    void loadTrip()
  }, [loadTrip])

  const handleRecoverSubmission = useCallback(async (input: { name: string; editCode: string }) => {
    const response = await fetch(`/api/trips/${tripId}/responses/recover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })

    const data = (await response.json()) as SaveResponsePayload

    if (!response.ok || !data.response) {
      throw new Error(data.error || 'Unable to recover response.')
    }

    const recoveredParticipant = responseToParticipant(data.response)
    const nextAccess = {
      responseId: data.response.id,
      editCode: data.response.editCode,
    }

    window.localStorage.setItem(getTripAccessKey(tripId), JSON.stringify(nextAccess))

    setTripAccess(nextAccess)
    setCurrentUserId(recoveredParticipant.id)
    setSavedEditCode(data.response.editCode)
    setSelectedParticipantId(recoveredParticipant.id)
    setEditingParticipant(recoveredParticipant)
    setHasSubmitted(false)
  }, [tripId])

  // Handle new submission or update existing
  const handleSubmit = useCallback(async (input: {
    name: string
    availability: DateRange | undefined
    destinations: string[]
    budget: string
    interests: string[]
    notes?: string
    editCode?: string
  }) => {
    const payload: CreateResponseInput = {
      name: input.name,
      availabilityStart: input.availability?.from?.toISOString() || null,
      availabilityEnd: input.availability?.to?.toISOString() || null,
      destinations: input.destinations,
      budget: input.budget,
      interests: input.interests,
      notes: input.notes || '',
      editCode: editingParticipant ? tripAccess?.editCode : input.editCode,
    }

    if (editingParticipant && tripAccess) {
      const response = await fetch(`/api/trips/${tripId}/responses/${editingParticipant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = (await response.json()) as SaveResponsePayload

      if (!response.ok || !data.response) {
        throw new Error(data.error || 'Unable to update response.')
      }

      await loadTrip()
      setSavedEditCode(data.response.editCode)
    } else {
      const response = await fetch(`/api/trips/${tripId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = (await response.json()) as SaveResponsePayload

      if (!response.ok || !data.response) {
        throw new Error(data.error || 'Unable to save response.')
      }

      const newParticipant = responseToParticipant(data.response)
      const nextAccess = {
        responseId: data.response.id,
        editCode: data.response.editCode,
      }

      window.localStorage.setItem(getTripAccessKey(tripId), JSON.stringify(nextAccess))

      setTripAccess(nextAccess)
      setCurrentUserId(newParticipant.id)
      setSavedEditCode(data.response.editCode)
      await loadTrip()
    }
    
    setHasSubmitted(true)
    setEditingParticipant(null)
  }, [editingParticipant, loadTrip, tripAccess, tripId])

  // Start editing a submission
  const handleEditSubmission = useCallback((participantId: string) => {
    const participant = participants.find(p => p.id === participantId)
    if (participant) {
      setEditingParticipant(participant)
      setHasSubmitted(false)
    }
  }, [participants])

  // Reset to view mode (after submission)
  const handleViewCalendar = useCallback(() => {
    setSelectedParticipantId((current) => current ?? participants[0]?.id ?? null)
    availabilitySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [participants])

  const handleGoToPlanning = useCallback(() => {
    window.location.href = `/plan/${tripId}`
  }, [tripId])

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return `${process.env.NEXT_PUBLIC_BASE_URL || 'https://outthegc.app'}/event/${tripId}`
    }

    return `${window.location.origin}/event/${tripId}`
  }, [tripId])

  const formatDateRange = (from: Date, to: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
    return `${from.toLocaleDateString('en-US', options)} - ${to.toLocaleDateString('en-US', options)}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border/60 bg-card p-10 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-foreground mb-2">Loading trip...</h1>
            <p className="text-sm text-muted-foreground">Pulling in the latest responses.</p>
          </div>
        </div>
      </div>
    )
  }

  if (loadError || !trip) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border/60 bg-card p-10 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-foreground mb-2">Trip not found</h1>
            <p className="text-sm text-muted-foreground">{loadError || 'This trip link does not exist.'}</p>
            <button
              onClick={() => void loadTrip()}
              className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6">
          {/* Top Bar */}
          <EventTopBar
            tripId={tripId}
            tripName={trip.name}
            dateRange={formatDateRange(new Date(trip.startDate), new Date(trip.endDate))}
            responseCount={participants.length}
            shareUrl={shareUrl}
            activeTab="responses"
          />

          {/* Main Content - Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Input Panel - 3/5 width on desktop */}
            <div className="lg:col-span-3">
              <EventInputPanel
                tripDateRange={{ from: new Date(trip.startDate), to: new Date(trip.endDate) }}
                destinationOptions={getDestinationOptions(trip.destinationOptions)}
                onSubmit={handleSubmit}
                onRecoverSubmission={handleRecoverSubmission}
                hasSubmitted={hasSubmitted}
                editingParticipant={editingParticipant}
                onEditSubmission={currentUserId ? () => handleEditSubmission(currentUserId) : undefined}
                onViewCalendar={handleViewCalendar}
                onGoToPlanning={handleGoToPlanning}
                savedEditCode={savedEditCode}
              />
            </div>

            {/* Summary Panel - 2/5 width on desktop */}
            <div className="lg:col-span-2">
              <EventSummaryPanel
                participants={participants}
                tripDateRange={{ from: new Date(trip.startDate), to: new Date(trip.endDate) }}
                selectedParticipantId={selectedParticipantId}
                onSelectParticipant={setSelectedParticipantId}
                currentUserId={currentUserId}
                onEditParticipant={handleEditSubmission}
                availabilitySectionRef={availabilitySectionRef}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
