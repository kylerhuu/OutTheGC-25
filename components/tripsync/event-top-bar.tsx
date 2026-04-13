'use client'

import Link from 'next/link'
import { CalendarDays, Users } from 'lucide-react'
import { CopyButton } from '@/components/tripsync/copy-button'
import { cn } from '@/lib/utils'

interface EventTopBarProps {
  tripId: string
  tripName: string
  dateRange: string
  responseCount: number
  shareUrl: string
  activeTab?: 'responses' | 'results' | 'plan'
  plusHref?: string
}

export function EventTopBar({
  tripId,
  tripName,
  dateRange,
  responseCount,
  shareUrl,
  activeTab = 'responses',
  plusHref,
}: EventTopBarProps) {
  const tabs = [
    { key: 'responses', label: 'Responses', href: `/event/${tripId}` },
    { key: 'results', label: 'Results', href: `/results/${tripId}` },
    { key: 'plan', label: 'Plan', href: `/plan/${tripId}` },
  ] as const

  return (
    <header className="rounded-2xl border border-border bg-card px-6 py-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance leading-tight">
              {tripName}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CalendarDays className="size-3.5 shrink-0 text-primary" />
                {dateRange}
              </span>
              <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Users className="size-3.5 shrink-0 text-primary" />
                {responseCount} {responseCount === 1 ? 'person' : 'people'}
              </span>
            </div>
          </div>

          <div className="inline-flex w-fit items-center rounded-xl border border-border bg-muted/50 p-1">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                className={cn(
                  'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-150',
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground',
                )}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="shrink-0">
          <div className="flex flex-wrap justify-end gap-2">
            {plusHref ? (
              <Link
                href={plusHref}
                className="inline-flex h-10 items-center rounded-xl border border-primary/30 bg-primary/10 px-4 text-sm font-semibold text-foreground transition hover:bg-primary/15"
              >
                OutTheGC Plus
              </Link>
            ) : null}
            <CopyButton textToCopy={shareUrl} />
          </div>
        </div>
      </div>
    </header>
  )
}
