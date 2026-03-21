'use client'

import type { RefObject } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { MapPin, DollarSign, Heart, Users } from 'lucide-react'
import { AvailabilityHeatmap } from '@/components/tripsync/availability-heatmap'
import { ParticipantDetails } from '@/components/tripsync/participant-details'
import type { ParticipantData } from '@/app/event/[tripId]/page'

interface EventSummaryPanelProps {
  participants: ParticipantData[]
  tripDuration: number
  onDurationChange: (duration: number) => void
  tripDateRange: { from: Date; to: Date }
  selectedParticipantId: string | null
  onSelectParticipant: (id: string | null) => void
  currentUserId: string | null
  onEditParticipant: (id: string) => void
  availabilitySectionRef?: RefObject<HTMLDivElement | null>
}

export function EventSummaryPanel({ 
  participants, 
  tripDuration, 
  onDurationChange,
  tripDateRange,
  selectedParticipantId,
  onSelectParticipant,
  currentUserId,
  onEditParticipant,
  availabilitySectionRef,
}: EventSummaryPanelProps) {
  // Aggregate data
  const destinationCounts = participants.reduce((acc, p) => {
    p.destinations.forEach(d => {
      acc[d] = (acc[d] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)

  const sortedDestinations = Object.entries(destinationCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const budgetCounts = participants.reduce((acc, p) => {
    if (p.budget) {
      acc[p.budget] = (acc[p.budget] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const interestCounts = participants.reduce((acc, p) => {
    p.interests.forEach(i => {
      acc[i] = (acc[i] || 0) + 1
    })
    return acc
  }, {} as Record<string, number>)

  const sortedInterests = Object.entries(interestCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)

  const totalParticipants = participants.length

  const budgetLabels: Record<string, string> = {
    budget: 'Budget ($)',
    moderate: 'Moderate ($$)',
    comfortable: 'Comfortable ($$$)',
    luxury: 'Luxury ($$$$)',
  }

  const interestLabels: Record<string, string> = {
    beach: 'Beach',
    mountains: 'Mountains',
    city: 'City',
    culture: 'Culture',
    food: 'Food & Dining',
    adventure: 'Adventure',
    nightlife: 'Nightlife',
    nature: 'Nature',
  }

  const selectedParticipant = selectedParticipantId 
    ? participants.find(p => p.id === selectedParticipantId)
    : null

  return (
    <div className="flex flex-col gap-5">
      {/* Clickable Participants */}
      <Card className="bg-card border-border/60 shadow-sm">
        <CardHeader className="pb-3.5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <Users className="size-4 text-primary" />
          Participants ({totalParticipants})
        </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {totalParticipants === 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">No responses yet</p>
              <p className="text-xs text-muted-foreground">Share the link above to start collecting answers.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <Badge 
                  key={p.id} 
                  variant={selectedParticipantId === p.id ? 'default' : 'secondary'}
                  className={`text-xs font-medium cursor-pointer transition-all ${
                    selectedParticipantId === p.id 
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' 
                      : 'hover:bg-secondary/80'
                  } ${currentUserId === p.id ? 'ring-1 ring-primary/50' : ''}`}
                  onClick={() => onSelectParticipant(p.id)}
                >
                  {p.name}
                  {currentUserId === p.id && ' (You)'}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participant Details (when selected) */}
      {selectedParticipant && (
        <ParticipantDetails
          participant={selectedParticipant}
          isCurrentUser={currentUserId === selectedParticipant.id}
          onEdit={currentUserId === selectedParticipant.id ? () => onEditParticipant(selectedParticipant.id) : undefined}
        />
      )}

      {/* Group Availability Heatmap */}
      <div ref={availabilitySectionRef} className="scroll-mt-24">
        <AvailabilityHeatmap
          participants={participants}
          tripDateRange={tripDateRange}
          tripDuration={tripDuration}
        />
      </div>

      {/* Trip Duration */}
      <Card className="bg-card border-border/60 shadow-sm">
        <CardHeader className="pb-3.5">
          <CardTitle className="text-sm font-semibold text-foreground">Trip Duration</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">{tripDuration}</span>
              <span className="text-muted-foreground text-xs font-medium">days</span>
            </div>
            <Slider
              value={[tripDuration]}
              onValueChange={(value) => onDurationChange(value[0])}
              min={3}
              max={14}
              step={1}
              className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-2 [&_[role=slider]]:border-primary-foreground"
            />
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>3</span>
              <span>14</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Destinations */}
      <Card className="bg-card border-border/60 shadow-sm">
        <CardHeader className="pb-3.5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <MapPin className="size-4 text-primary" />
            Top Destinations
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {sortedDestinations.length === 0 ? (
            <p className="text-xs text-muted-foreground">No destination votes yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sortedDestinations.map(([dest, count]) => (
                <div key={dest} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{dest}</span>
                    <span className="text-xs font-medium text-primary">{count} {count === 1 ? 'vote' : 'votes'}</span>
                  </div>
                  <Progress value={(count / totalParticipants) * 100} className="h-2 rounded-full" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Distribution */}
      <Card className="bg-card border-border/60 shadow-sm">
        <CardHeader className="pb-3.5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <DollarSign className="size-4 text-primary" />
            Budget Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {Object.keys(budgetCounts).length === 0 ? (
            <p className="text-xs text-muted-foreground">No budget responses yet</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {Object.entries(budgetCounts).map(([budget, count]) => (
                <div key={budget} className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{budgetLabels[budget] || budget}</span>
                  <Badge variant="secondary" className="text-xs font-medium">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interests */}
      <Card className="bg-card border-border/60 shadow-sm">
        <CardHeader className="pb-3.5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Heart className="size-4 text-primary" />
            Top Interests
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {sortedInterests.length === 0 ? (
            <p className="text-xs text-muted-foreground">No interest responses yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sortedInterests.map(([interest, count]) => (
                <Badge key={interest} variant="outline" className="gap-1.5 text-xs font-medium bg-primary/5 text-primary border-primary/20 hover:border-primary/40">
                  {interestLabels[interest] || interest}
                  <span className="font-semibold">{count}</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
