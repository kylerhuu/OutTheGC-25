'use client'

import { Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CopyButton } from '@/components/tripsync/copy-button'

interface EventTopBarProps {
  tripName: string
  dateRange: string
  responseCount: number
  shareUrl: string
}

export function EventTopBar({ tripName, dateRange, responseCount, shareUrl }: EventTopBarProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border/50 bg-gradient-to-b from-card/80 to-card/40 px-8 py-6 rounded-xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground text-balance">{tripName}</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="size-4" />
            <span className="text-sm">{dateRange}</span>
          </div>
          <Badge variant="secondary" className="text-xs font-medium">
            {responseCount} {responseCount === 1 ? 'response' : 'responses'}
          </Badge>
        </div>
      </div>
      
      <CopyButton textToCopy={shareUrl} />
    </header>
  )
}
