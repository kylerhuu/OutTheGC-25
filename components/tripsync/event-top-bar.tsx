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
  activeTab?: 'responses' | 'results' | 'plan'
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
    { key: 'results', label: 'Results', href: `/results/${tripId}` },
    { key: 'plan', label: 'Plan', href: `/plan/${tripId}` },
  ] as const

  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-primary/10 bg-gradient-to-br from-cyan-500/8 via-card to-fuchsia-500/8 px-8 py-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground text-balance">{tripName}</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="size-4" />
            <span className="text-sm">{dateRange}</span>
          </div>
          <Badge variant="secondary" className="border border-primary/10 bg-primary/10 text-xs font-medium text-primary">
            {responseCount} {responseCount === 1 ? 'response' : 'responses'}
          </Badge>
        </div>
        <div className="inline-flex w-fit items-center rounded-2xl border border-primary/10 bg-background/80 p-1 shadow-sm backdrop-blur">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={cn(
                'rounded-xl px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
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
