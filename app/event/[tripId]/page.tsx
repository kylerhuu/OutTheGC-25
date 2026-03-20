'use client'

import { useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { EventTopBar } from '@/components/tripsync/event-top-bar'
import { EventInputPanel } from '@/components/tripsync/event-input-panel'
import { EventSummaryPanel } from '@/components/tripsync/event-summary-panel'

// Generate unique ID for participants
function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

function generateMockTrip(tripId: string) {
  // Generate consistent mock data based on tripId
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://outthegc.app'
  return {
    id: tripId,
    name: `Trip: ${tripId}`,
    dateRange: {
      from: new Date(2026, 5, 15), // June 15, 2026
      to: new Date(2026, 6, 15),   // July 15, 2026
    },
    shareUrl: `${baseUrl}/event/${tripId}`,
  }
}

// Enhanced mock participants with IDs, passwords, and notes
const MOCK_PARTICIPANTS: ParticipantData[] = [
  {
    id: 'alex001',
    name: 'Alex',
    editCode: 'alex123',
    availability: { from: new Date(2026, 5, 20), to: new Date(2026, 6, 5) },
    destinations: ['Barcelona', 'Lisbon', 'Portugal'],
    budget: 'moderate',
    interests: ['beach', 'food', 'culture'],
    notes: 'Prefer warm weather destinations',
    submittedAt: new Date(2026, 4, 1),
  },
  {
    id: 'jordan002',
    name: 'Jordan',
    editCode: 'jordan123',
    availability: { from: new Date(2026, 5, 18), to: new Date(2026, 6, 8) },
    destinations: ['Barcelona', 'Greece', 'Iceland'],
    budget: 'comfortable',
    interests: ['adventure', 'nature', 'food'],
    notes: '',
    submittedAt: new Date(2026, 4, 2),
  },
  {
    id: 'sam003',
    name: 'Sam',
    editCode: 'sam123',
    availability: { from: new Date(2026, 5, 22), to: new Date(2026, 6, 10) },
    destinations: ['Lisbon', 'Barcelona', 'Costa Rica'],
    budget: 'moderate',
    interests: ['beach', 'nightlife', 'city'],
    notes: 'Flexible on dates if needed',
    submittedAt: new Date(2026, 4, 3),
  },
]

export interface ParticipantData {
  id: string
  name: string
  editCode: string
  availability: { from: Date; to: Date } | null
  destinations: string[]
  budget: string
  interests: string[]
  notes: string
  submittedAt: Date
}

export default function EventPage() {
  const params = useParams()
  const tripId = params.tripId as string
  const mockTrip = useMemo(() => generateMockTrip(tripId), [tripId])
  
  const [participants, setParticipants] = useState<ParticipantData[]>(MOCK_PARTICIPANTS)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [tripDuration, setTripDuration] = useState(7)
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(
    MOCK_PARTICIPANTS[0]?.id ?? null
  )
  const [editingParticipant, setEditingParticipant] = useState<ParticipantData | null>(null)

  // Handle new submission or update existing
  const handleSubmit = useCallback((input: {
    name: string
    availability: { from: Date; to: Date } | undefined
    destinations: string[]
    budget: string
    interests: string[]
    notes?: string
    editCode?: string
  }) => {
    if (editingParticipant) {
      // Update existing participant
      setParticipants(prev => prev.map(p => 
        p.id === editingParticipant.id
          ? {
              ...p,
              name: input.name,
              availability: input.availability ? { from: input.availability.from!, to: input.availability.to! } : null,
              destinations: input.destinations,
              budget: input.budget,
              interests: input.interests,
              notes: input.notes || '',
              submittedAt: new Date(),
            }
          : p
      ))
      setSelectedParticipantId(editingParticipant.id)
      setCurrentUserId(editingParticipant.id)
    } else {
      // Create new participant
      const newId = generateId()
      const newParticipant: ParticipantData = {
        id: newId,
        name: input.name,
        editCode: input.editCode || generateId(),
        availability: input.availability ? { from: input.availability.from!, to: input.availability.to! } : null,
        destinations: input.destinations,
        budget: input.budget,
        interests: input.interests,
        notes: input.notes || '',
        submittedAt: new Date(),
      }
      
      setParticipants(prev => [...prev, newParticipant])
      setSelectedParticipantId(newId)
      setCurrentUserId(newId)
    }
    
    setHasSubmitted(true)
    setEditingParticipant(null)
  }, [editingParticipant])

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
    // Keep hasSubmitted true but allow viewing
  }, [])

  // Start a new submission (clear edit state)
  const handleNewSubmission = useCallback(() => {
    setEditingParticipant(null)
    setHasSubmitted(false)
  }, [])

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
            tripName={mockTrip.name}
            dateRange={formatDateRange(mockTrip.dateRange.from, mockTrip.dateRange.to)}
            responseCount={participants.length}
            shareUrl={mockTrip.shareUrl}
          />

          {/* Main Content - Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Input Panel - 3/5 width on desktop */}
            <div className="lg:col-span-3">
              <EventInputPanel
                tripDateRange={mockTrip.dateRange}
                onSubmit={handleSubmit}
                hasSubmitted={hasSubmitted}
                editingParticipant={editingParticipant}
                onEditSubmission={currentUserId ? () => handleEditSubmission(currentUserId) : undefined}
                onViewCalendar={handleViewCalendar}
              />
            </div>

            {/* Summary Panel - 2/5 width on desktop */}
            <div className="lg:col-span-2">
              <EventSummaryPanel
                participants={participants}
                tripDuration={tripDuration}
                onDurationChange={setTripDuration}
                tripDateRange={mockTrip.dateRange}
                selectedParticipantId={selectedParticipantId}
                onSelectParticipant={setSelectedParticipantId}
                currentUserId={currentUserId}
                onEditParticipant={handleEditSubmission}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
