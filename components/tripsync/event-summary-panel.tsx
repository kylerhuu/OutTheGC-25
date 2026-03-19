'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import { Calendar, MapPin, DollarSign, Heart, Users } from 'lucide-react'

interface ParticipantData {
  name: string
  availability: { from: Date; to: Date } | null
  destinations: string[]
  budget: string
  interests: string[]
}

interface EventSummaryPanelProps {
  participants: ParticipantData[]
  tripDuration: number
  onDurationChange: (duration: number) => void
}

export function EventSummaryPanel({ 
  participants, 
  tripDuration, 
  onDurationChange 
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

  // Find overlapping availability windows
  const availabilities = participants
    .filter(p => p.availability)
    .map(p => p.availability!)

  const findBestWindows = () => {
    if (availabilities.length === 0) return []
    
    // Find the range where all participants overlap
    const latestStart = new Date(Math.max(...availabilities.map(a => a.from.getTime())))
    const earliestEnd = new Date(Math.min(...availabilities.map(a => a.to.getTime())))
    
    if (latestStart <= earliestEnd) {
      const daysDiff = Math.ceil((earliestEnd.getTime() - latestStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
      return [{
        from: latestStart,
        to: earliestEnd,
        participants: availabilities.length,
        days: daysDiff
      }]
    }
    
    return []
  }

  const bestWindows = findBestWindows()
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Participants */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4 text-primary" />
            Participants
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalParticipants === 0 ? (
            <p className="text-sm text-muted-foreground">No responses yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {participants.map((p, i) => (
                <Badge key={i} variant="secondary">{p.name}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Best Time Windows */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="size-4 text-primary" />
            Best Time Windows
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bestWindows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {availabilities.length === 0 
                ? 'Waiting for availability responses' 
                : 'No overlapping availability found'}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {bestWindows.map((window, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {formatDate(window.from)} - {formatDate(window.to)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {window.days} days
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={(window.participants / totalParticipants) * 100} className="flex-1 h-1.5" />
                    <span className="text-xs text-muted-foreground">
                      {window.participants}/{totalParticipants}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trip Duration */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Trip Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-semibold text-primary">{tripDuration}</span>
              <span className="text-muted-foreground text-sm">days</span>
            </div>
            <Slider
              value={[tripDuration]}
              onValueChange={(value) => onDurationChange(value[0])}
              min={3}
              max={14}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>3 days</span>
              <span>14 days</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Destinations */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="size-4 text-primary" />
            Top Destinations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedDestinations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No destination votes yet</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sortedDestinations.map(([dest, count]) => (
                <div key={dest} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{dest}</span>
                      <span className="text-xs text-muted-foreground">{count} votes</span>
                    </div>
                    <Progress value={(count / totalParticipants) * 100} className="h-1.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Distribution */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="size-4 text-primary" />
            Budget Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(budgetCounts).length === 0 ? (
            <p className="text-sm text-muted-foreground">No budget responses yet</p>
          ) : (
            <div className="flex flex-col gap-2">
              {Object.entries(budgetCounts).map(([budget, count]) => (
                <div key={budget} className="flex items-center justify-between">
                  <span className="text-sm">{budgetLabels[budget] || budget}</span>
                  <Badge variant="secondary" className="text-xs">
                    {count} {count === 1 ? 'person' : 'people'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interests */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Heart className="size-4 text-primary" />
            Top Interests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedInterests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interest responses yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sortedInterests.map(([interest, count]) => (
                <Badge key={interest} variant="outline" className="gap-1">
                  {interestLabels[interest] || interest}
                  <span className="text-muted-foreground">({count})</span>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
