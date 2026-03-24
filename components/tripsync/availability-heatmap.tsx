'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import type { ParticipantData } from '@/app/event/[tripId]/page'

interface AvailabilityHeatmapProps {
  participants: ParticipantData[]
  tripDateRange: { from: Date; to: Date }
  tripDurationDays?: number
}

interface DayData {
  date: Date
  count: number
  total: number
  percentage: number
}

interface DateRangeOption {
  start: Date
  end: Date
  score: number
  minAvailable: number
}

export function AvailabilityHeatmap({ participants, tripDateRange, tripDurationDays }: AvailabilityHeatmapProps) {
  const [activeWindowKey, setActiveWindowKey] = useState<string | null>(null)

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
  const suggestedDuration = Math.min(tripDurationDays ?? 4, Math.max(1, heatmapData.length))

  const bestWindows = useMemo(() => {
    if (participants.length === 0 || heatmapData.length === 0 || suggestedDuration > heatmapData.length) {
      return []
    }

    const windows: DateRangeOption[] = []

    for (let startIndex = 0; startIndex <= heatmapData.length - suggestedDuration; startIndex += 1) {
      const slice = heatmapData.slice(startIndex, startIndex + suggestedDuration)
      const totalAvailable = slice.reduce((sum, day) => sum + day.count, 0)
      const minAvailable = slice.reduce((lowest, day) => Math.min(lowest, day.count), slice[0]?.count ?? 0)

      windows.push({
        start: slice[0].date,
        end: slice[slice.length - 1].date,
        score: totalAvailable,
        minAvailable,
      })
    }

    const sorted = windows
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        if (b.minAvailable !== a.minAvailable) return b.minAvailable - a.minAvailable
        return a.start.getTime() - b.start.getTime()
      })

    const distinct: DateRangeOption[] = []

    for (const window of sorted) {
      const overlapsExisting = distinct.some((existing) => {
        return window.start <= existing.end && window.end >= existing.start
      })

      if (!overlapsExisting) {
        distinct.push(window)
      }

      if (distinct.length === 3) {
        break
      }
    }

    return distinct
  }, [heatmapData, participants.length, suggestedDuration])

  const activeWindow = useMemo(() => {
    if (!bestWindows.length) return null
    return bestWindows.find((window) => getWindowKey(window) === activeWindowKey) ?? null
  }, [activeWindowKey, bestWindows])

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
          {bestWindows.length > 0 && (
            <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Best Dates to Go
              </p>
              <div className="space-y-2">
                {bestWindows.map((window, index) => (
                  <div
                    key={`${window.start.toISOString()}-${window.end.toISOString()}`}
                    className={`flex cursor-pointer items-start justify-between gap-3 rounded-lg border px-3 py-2 transition-colors ${
                      activeWindowKey === getWindowKey(window)
                        ? 'border-primary/40 bg-primary/10'
                        : 'border-transparent bg-background hover:border-border/70 hover:bg-muted/40'
                    }`}
                    onMouseEnter={() => setActiveWindowKey(getWindowKey(window))}
                    onMouseLeave={() => setActiveWindowKey(null)}
                    onClick={() =>
                      setActiveWindowKey((current) =>
                        current === getWindowKey(window) ? null : getWindowKey(window),
                      )
                    }
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {window.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {window.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-muted-foreground">{window.minAvailable}/{participants.length} available</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-primary">#{index + 1}</p>
                      <p className="text-xs text-muted-foreground">{suggestedDuration} day{suggestedDuration === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                    return <div key={dayIndex} className="aspect-square max-h-9 rounded-sm" />
                  }
                  const isFirstOfMonth =
                    day.date.getDate() === 1 ||
                    day.date.getTime() === heatmapData[0]?.date.getTime()
                  const isHighlighted =
                    activeWindow &&
                    day.date >= activeWindow.start &&
                    day.date <= activeWindow.end

                  return (
                    <div
                      key={dayIndex}
                      className={`relative flex aspect-square max-h-11 min-h-10 flex-col items-center justify-center rounded-md border text-[11px] font-medium transition-all cursor-default ${
                        isHighlighted ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'
                      } ${getIntensityClass(day.percentage)} ${day.percentage >= 75 ? 'text-primary-foreground' : 'text-foreground/80'}`}
                      title={`${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${day.count}/${day.total} available`}
                    >
                      {isFirstOfMonth && (
                        <span className={`text-[9px] font-semibold uppercase tracking-wide ${day.percentage >= 75 ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                          {day.date.toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      )}
                      <span>{day.date.getDate()}</span>
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

function getWindowKey(window: { start: Date; end: Date }) {
  return `${window.start.toISOString()}-${window.end.toISOString()}`
}
