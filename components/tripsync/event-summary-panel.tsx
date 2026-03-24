'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users } from 'lucide-react'
import { ParticipantDetails } from '@/components/tripsync/participant-details'
import type { ParticipantData } from '@/app/event/[tripId]/page'

interface EventSummaryPanelProps {
  participants: ParticipantData[]
  selectedParticipantId: string | null
  onSelectParticipant: (id: string | null) => void
  currentUserId: string | null
  onEditParticipant: (id: string) => void
}

export function EventSummaryPanel({
  participants,
  selectedParticipantId,
  onSelectParticipant,
  currentUserId,
  onEditParticipant,
}: EventSummaryPanelProps) {
  const selectedParticipant = selectedParticipantId
    ? participants.find((participant) => participant.id === selectedParticipantId)
    : null

  return (
    <div className="flex flex-col gap-5">
      <Card className="bg-card border-border/60 shadow-sm">
        <CardHeader className="pb-3.5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Users className="size-4 text-primary" />
            Participants ({participants.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {participants.length === 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">No responses yet</p>
              <p className="text-xs text-muted-foreground">Share the link above to start collecting answers.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {participants.map((participant) => (
                <Badge
                  key={participant.id}
                  variant={selectedParticipantId === participant.id ? 'default' : 'secondary'}
                  className={`cursor-pointer text-xs font-medium transition-all ${
                    selectedParticipantId === participant.id
                      ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                      : 'hover:bg-secondary/80'
                  } ${currentUserId === participant.id ? 'ring-1 ring-primary/50' : ''}`}
                  onClick={() => onSelectParticipant(participant.id)}
                >
                  {participant.name}
                  {currentUserId === participant.id && ' (You)'}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedParticipant && (
        <ParticipantDetails
          participant={selectedParticipant}
          isCurrentUser={currentUserId === selectedParticipant.id}
          onEdit={currentUserId === selectedParticipant.id ? () => onEditParticipant(selectedParticipant.id) : undefined}
        />
      )}
    </div>
  )
}
