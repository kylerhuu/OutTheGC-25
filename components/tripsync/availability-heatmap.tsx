'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import type { ParticipantData } from '@/app/event/[tripId]/page'

interface AvailabilityHeatmapProps {
  participants: ParticipantData[]
  tripDateRange: { from: Date; to: Date }
}

interface DayData {
  date: Date
  count: number
  total: number
  percentage: number
}

export function AvailabilityHeatmap({ participants, tripDateRange }: AvailabilityHeatmapProps) {
  // Generate all days in the trip date range with availability counts
  const heatmapData = useMemo(() => {
    const days: DayData[] = []
    const currentDate = new Date(tripDateRange.from)
    const endDate = new Date(tripDateRange.to)
    const totalParticipants = participants.length

    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate)
      dayStart.setHours(0, 0, 0, 0)
      
      // Count how many participants are available on this day
      const availableCount = participants.filter(p => {
        if (!p.availability) return false
        const availFrom = new Date(p.availability.from)
        const availTo = new Date(p.availability.to)
        availFrom.setHours(0, 0, 0, 0)
        availTo.setHours(23, 59, 59, 999)
        return dayStart >= availFrom && dayStart <= availTo
      }).length

      days.push({
        date: new Date(currentDate),
        count: availableCount,
        total: totalParticipants,
        percentage: totalParticipants > 0 ? (availableCount / totalParticipants) * 100 : 0,
      })

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return days
  }, [participants, tripDateRange])

  // Group days by week for grid display
  const weeks = useMemo(() => {
    const result: DayData[][] = []
    let currentWeek: DayData[] = []
    
    // Pad start to align with day of week (0 = Sunday)
    if (heatmapData.length > 0) {
      const firstDay = heatmapData[0].date.getDay()
      for (let i = 0; i < firstDay; i++) {
        currentWeek.push({ date: new Date(0), count: -1, total: 0, percentage: 0 })
      }
    }

    heatmapData.forEach((day) => {
      currentWeek.push(day)
      if (currentWeek.length === 7) {
        result.push(currentWeek)
        currentWeek = []
      }
    })

    // Pad end
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: new Date(0), count: -1, total: 0, percentage: 0 })
      }
      result.push(currentWeek)
    }

    return result
  }, [heatmapData])

  // Get intensity color based on percentage
  const getIntensityClass = (percentage: number) => {
    if (percentage === 0) return 'bg-muted/30'
    if (percentage <= 25) return 'bg-primary/20'
    if (percentage <= 50) return 'bg-primary/40'
    if (percentage <= 75) return 'bg-primary/60'
    return 'bg-primary/90'
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  if (participants.length === 0) {
    return (
      <Card className="bg-card border-border/60 shadow-sm">
        <CardHeader className="pb-3.5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Calendar className="size-4 text-primary" />
            Group Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">No responses yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border/60 shadow-sm">
      <CardHeader className="pb-3.5">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-foreground">
          <Calendar className="size-4 text-primary" />
          Group Availability
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-col gap-3">
          {/* Day labels */}
          <div className="grid grid-cols-7 gap-1">
            {dayLabels.map((label, i) => (
              <div key={i} className="text-center text-xs font-medium text-muted-foreground">
                {label}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex flex-col gap-1">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-1">
                {week.map((day, dayIndex) => {
                  if (day.count === -1) {
                    return <div key={dayIndex} className="aspect-square rounded-sm" />
                  }
                  return (
                    <div
                      key={dayIndex}
                      className={`aspect-square rounded-sm flex items-center justify-center text-xs font-medium transition-colors cursor-default ${getIntensityClass(day.percentage)} ${day.percentage >= 75 ? 'text-primary-foreground' : 'text-foreground/70'}`}
                      title={`${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${day.count}/${day.total} available`}
                    >
                      {day.date.getDate()}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <span className="text-xs text-muted-foreground">Less</span>
            <div className="flex items-center gap-1">
              <div className="size-3 rounded-sm bg-muted/30" />
              <div className="size-3 rounded-sm bg-primary/20" />
              <div className="size-3 rounded-sm bg-primary/40" />
              <div className="size-3 rounded-sm bg-primary/60" />
              <div className="size-3 rounded-sm bg-primary/90" />
            </div>
            <span className="text-xs text-muted-foreground">More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
