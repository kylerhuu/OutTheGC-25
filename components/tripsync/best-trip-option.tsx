'use client'

import { Heart, Users, MapPin, Calendar } from 'lucide-react'

interface BestOptionProps {
  bestDates: string
  peopleCount: number
  topDestinations: string[]
}

export function BestTripOption({ bestDates, peopleCount, topDestinations }: BestOptionProps) {
  const destinationText = topDestinations.slice(0, 2).join(' or ')

  return (
    <div className="featured-card rounded-2xl bg-gradient-to-br from-primary/8 via-card to-accent/5 p-8 border border-primary/15">
      {/* Decorative glow background */}
      <div className="absolute inset-0 rounded-2xl pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-radial from-primary/10 to-transparent rounded-full blur-3xl opacity-40" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary fill-primary animate-pulse" />
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Best Option</span>
          </div>
        </div>

        {/* Main content */}
        <h3 className="text-2xl font-bold text-foreground mb-1 leading-tight">
          The group is most available
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Here's what makes sense for everyone
        </p>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Dates */}
          <div className="bg-background/50 backdrop-blur rounded-xl p-4 border border-border/60 hover-lift">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">Best Dates</span>
            </div>
            <p className="text-sm font-bold text-foreground">{bestDates}</p>
          </div>

          {/* People */}
          <div className="bg-background/50 backdrop-blur rounded-xl p-4 border border-border/60 hover-lift">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold text-muted-foreground">Available</span>
            </div>
            <p className="text-sm font-bold text-foreground">{peopleCount} people</p>
          </div>

          {/* Destination */}
          <div className="bg-background/50 backdrop-blur rounded-xl p-4 border border-border/60 hover-lift">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-muted-foreground">Top Pick</span>
            </div>
            <p className="text-sm font-bold text-foreground text-balance leading-tight">{destinationText}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-primary/10 rounded-xl p-4 border border-primary/20 text-center">
          <p className="text-xs font-semibold text-primary">Ready to plan? Lock these in on the Plan tab.</p>
        </div>
      </div>
    </div>
  )
}
