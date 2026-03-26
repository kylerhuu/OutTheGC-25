'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'
import { ParticipantDetails } from '@/components/tripsync/participant-details'

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

interface EventSummaryPanelProps {
  participants: ParticipantData[]
  selectedParticipantId: string | null
  onSelectParticipant: (id: string | null) => void
  currentUserId: string | null
  onEditParticipant: (id: string) => void
}

// Get consistent avatar color from name
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
                <button
                  key={participant.id}
                  onClick={() => onSelectParticipant(participant.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-150 ease-out ${
                    selectedParticipantId === participant.id
                      ? 'bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/30 -translate-y-px'
                      : 'bg-muted/50 text-foreground border-border hover:bg-muted hover:-translate-y-px hover:shadow-sm'
                  }`}
                >
                  <div
                    className={`size-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                      selectedParticipantId === participant.id
                        ? 'bg-primary-foreground/20'
                        : getAvatarColor(participant.name)
                    }`}
                  >
                    {getInitials(participant.name)}
                  </div>
                  <span className="text-xs font-medium">
                    {participant.name}
                    {currentUserId === participant.id && ' (You)'}
                  </span>
                </button>
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
