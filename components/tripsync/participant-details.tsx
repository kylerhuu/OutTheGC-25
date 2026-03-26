'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, DollarSign, Heart, MessageSquare, Pencil } from 'lucide-react'

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

interface ParticipantDetailsProps {
  participant: ParticipantData
  isCurrentUser?: boolean
  onEdit?: () => void
}

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
  shopping: 'Shopping',
  relaxation: 'Relaxation',
  wellness: 'Wellness & Spa',
  museums: 'Museums & History',
  music: 'Live Music',
  roadtrip: 'Road Trip',
  photography: 'Scenic Views',
  sports: 'Sports & Games',
}

export function ParticipantDetails({ participant, isCurrentUser, onEdit }: ParticipantDetailsProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <Card className={`bg-card border-border/60 shadow-sm ${isCurrentUser ? 'ring-2 ring-primary/30' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            {participant.name}
            {isCurrentUser && (
              <Badge variant="outline" className="text-xs font-medium bg-primary/10 text-primary border-primary/20">
                You
              </Badge>
            )}
          </CardTitle>
          {isCurrentUser && onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="gap-1.5 text-primary hover:text-primary hover:bg-primary/10"
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Submitted {formatFullDate(participant.submittedAt)}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        {/* Availability */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Calendar className="size-4 text-primary" />
            Availability
          </div>
          {participant.availability ? (
            <p className="text-sm text-muted-foreground pl-6">
              {formatDate(participant.availability.from)} – {formatDate(participant.availability.to)}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground pl-6 italic">Not specified</p>
          )}

          {participant.unavailableRanges.length > 0 && (
            <div className="pl-6 pt-1">
              <p className="text-xs font-medium text-destructive">Blocked inside that range</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {participant.unavailableRanges.map((range) => (
                  <Badge
                    key={`${range.from.toISOString()}-${range.to.toISOString()}`}
                    variant="outline"
                    className="border-destructive/25 bg-destructive/8 text-xs text-foreground"
                  >
                    {formatDate(range.from)} – {formatDate(range.to)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Destinations */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <MapPin className="size-4 text-primary" />
            Destinations
          </div>
          {participant.destinations.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pl-6">
              {participant.destinations.map((dest) => (
                <Badge key={dest} variant="secondary" className="text-xs font-medium">
                  {dest}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground pl-6 italic">None selected</p>
          )}
        </div>

        {/* Budget */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <DollarSign className="size-4 text-primary" />
            Budget
          </div>
          {participant.budget ? (
            <p className="text-sm text-muted-foreground pl-6">
              {budgetLabels[participant.budget] || participant.budget}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground pl-6 italic">Not specified</p>
          )}
        </div>

        {/* Interests */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Heart className="size-4 text-primary" />
            Interests
          </div>
          {participant.interests.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pl-6">
              {participant.interests.map((interest) => (
                <Badge key={interest} variant="outline" className="text-xs font-medium bg-primary/5 text-primary border-primary/20">
                  {interestLabels[interest] || interest}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground pl-6 italic">None selected</p>
          )}
        </div>

        {/* Notes */}
        {participant.notes && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MessageSquare className="size-4 text-primary" />
              Notes
            </div>
            <p className="text-sm text-muted-foreground pl-6">
              {participant.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
