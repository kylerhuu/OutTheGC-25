'use client'

import { MapPin, Calendar, Users } from 'lucide-react'
import type { TripWithResponses, TripPlanRecord } from '@/lib/trip-types'

interface TripSnapshotProps {
  trip: TripWithResponses
  plan: TripPlanRecord
}

export function TripSnapshot({ trip, plan }: TripSnapshotProps) {
  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="featured-card rounded-2xl bg-gradient-to-br from-accent/8 via-card to-primary/5 p-6 border border-accent/15 mb-8">
      {/* Decorative glow */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-radial from-accent/10 to-transparent rounded-full blur-3xl opacity-40" />
      </div>

      <div className="relative z-10">
        {/* Label */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-bold text-accent uppercase tracking-widest">Trip Snapshot</span>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          {/* Trip name */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Trip name
            </p>
            <h3 className="text-lg font-bold text-foreground leading-tight">{trip.tripName}</h3>
          </div>

          {/* Destination */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Destination
              </p>
            </div>
            <p className="text-lg font-bold text-foreground">
              {plan.finalDestination || '—'}
            </p>
          </div>

          {/* Dates */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Dates
              </p>
            </div>
            <p className="text-lg font-bold text-foreground">
              {plan.finalStartDate && plan.finalEndDate
                ? `${formatDate(plan.finalStartDate)} – ${formatDate(plan.finalEndDate)}`
                : '—'}
            </p>
          </div>

          {/* Participants */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-accent" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Going
              </p>
            </div>
            <p className="text-lg font-bold text-foreground">
              {trip.responses?.length || 0} {trip.responses?.length === 1 ? 'person' : 'people'}
            </p>
          </div>
        </div>

        {/* Visual divider */}
        <div className="mt-6 pt-6 border-t border-border/60 text-xs text-muted-foreground">
          <p>Fill in details below, then move the trip to Slack/GC when ready</p>
        </div>
      </div>
    </div>
  )
}
