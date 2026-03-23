'use client'

import Link from 'next/link'
import { Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CopyButton } from '@/components/tripsync/copy-button'
import { cn } from '@/lib/utils'

interface EventTopBarProps {
  tripId: string
  tripName: string
  dateRange: string
  responseCount: number
  shareUrl: string
  activeTab?: 'responses' | 'plan'
}

export function EventTopBar({
  tripId,
  tripName,
  dateRange,
  responseCount,
  shareUrl,
  activeTab = 'responses',
}: EventTopBarProps) {
  const tabs = [
    { key: 'responses', label: 'Responses', href: `/event/${tripId}` },
    { key: 'plan', label: 'Plan', href: `/plan/${tripId}` },
  ] as const

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
        <div className="inline-flex w-fit items-center rounded-lg bg-muted p-1">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      
      <CopyButton textToCopy={shareUrl} />
    </header>
  )
}
