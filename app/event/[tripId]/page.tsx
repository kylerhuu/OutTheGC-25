'use client'

import { useState } from 'react'
import { EventTopBar } from '@/components/tripsync/event-top-bar'
import { EventInputPanel } from '@/components/tripsync/event-input-panel'
import { EventSummaryPanel } from '@/components/tripsync/event-summary-panel'

// Mock trip data - in production this would come from a database
const MOCK_TRIP = {
  id: 'summer-2026-europe',
  name: 'Summer 2026 Europe Trip',
  dateRange: {
    from: new Date(2026, 5, 15), // June 15, 2026
    to: new Date(2026, 6, 15),   // July 15, 2026
  },
  shareUrl: 'https://tripsync.app/event/summer-2026-europe',
}

// Mock existing participants
const MOCK_PARTICIPANTS = [
  {
    name: 'Alex',
    availability: { from: new Date(2026, 5, 20), to: new Date(2026, 6, 5) },
    destinations: ['Barcelona', 'Lisbon', 'Portugal'],
    budget: 'moderate',
    interests: ['beach', 'food', 'culture'],
  },
  {
    name: 'Jordan',
    availability: { from: new Date(2026, 5, 18), to: new Date(2026, 6, 8) },
    destinations: ['Barcelona', 'Greece', 'Iceland'],
    budget: 'comfortable',
    interests: ['adventure', 'nature', 'food'],
  },
  {
    name: 'Sam',
    availability: { from: new Date(2026, 5, 22), to: new Date(2026, 6, 10) },
    destinations: ['Lisbon', 'Barcelona', 'Costa Rica'],
    budget: 'moderate',
    interests: ['beach', 'nightlife', 'city'],
  },
]

interface ParticipantData {
  name: string
  availability: { from: Date; to: Date } | null
  destinations: string[]
  budget: string
  interests: string[]
}

export default function EventPage() {
  const [participants, setParticipants] = useState<ParticipantData[]>(MOCK_PARTICIPANTS)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [tripDuration, setTripDuration] = useState(7)

  const handleSubmit = (input: {
    name: string
    availability: { from: Date; to: Date } | undefined
    destinations: string[]
    budget: string
    interests: string[]
  }) => {
    const newParticipant: ParticipantData = {
      name: input.name,
      availability: input.availability ? { from: input.availability.from!, to: input.availability.to! } : null,
      destinations: input.destinations,
      budget: input.budget,
      interests: input.interests,
    }
    
    setParticipants(prev => [...prev, newParticipant])
    setHasSubmitted(true)
  }

  const formatDateRange = (from: Date, to: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
    return `${from.toLocaleDateString('en-US', options)} - ${to.toLocaleDateString('en-US', options)}`
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6">
          {/* Top Bar */}
          <EventTopBar
            tripName={MOCK_TRIP.name}
            dateRange={formatDateRange(MOCK_TRIP.dateRange.from, MOCK_TRIP.dateRange.to)}
            responseCount={participants.length}
            shareUrl={MOCK_TRIP.shareUrl}
          />

          {/* Main Content - Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Input Panel - 3/5 width on desktop */}
            <div className="lg:col-span-3">
              <EventInputPanel
                tripDateRange={MOCK_TRIP.dateRange}
                onSubmit={handleSubmit}
                hasSubmitted={hasSubmitted}
              />
            </div>

            {/* Summary Panel - 2/5 width on desktop */}
            <div className="lg:col-span-2">
              <EventSummaryPanel
                participants={participants}
                tripDuration={tripDuration}
                onDurationChange={setTripDuration}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
