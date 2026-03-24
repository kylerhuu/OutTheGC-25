'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar } from 'lucide-react'
import type { ParticipantData } from '@/app/event/[tripId]/page'

interface AvailabilityHeatmapProps {
  participants: ParticipantData[]
  tripDateRange: { from: Date; to: Date }
  tripDurationDays?: number
  onApplyWindow?: (window: { start: Date; end: Date }) => void
  appliedWindowKey?: string | null
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

interface MonthSection {
  key: string
  label: string
  weeks: DayData[][]
}

export function AvailabilityHeatmap({
  participants,
  tripDateRange,
  tripDurationDays,
  onApplyWindow,
  appliedWindowKey,
}: AvailabilityHeatmapProps) {
  const [activeWindowKey, setActiveWindowKey] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)

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

  // Get intensity color based on percentage
  const getIntensityClass = (percentage: number, useNeutralScale: boolean) => {
    if (useNeutralScale) {
      if (percentage === 0) return 'bg-muted/20'
      return 'bg-primary/20'
    }
    if (percentage === 0) return 'bg-muted/30'
    if (percentage <= 25) return 'bg-primary/15'
    if (percentage <= 50) return 'bg-primary/35'
    if (percentage <= 75) return 'bg-primary/55'
    return 'bg-primary/80'
  }

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const suggestedDuration = Math.min(tripDurationDays ?? 4, Math.max(1, heatmapData.length))
  const hasUniformAvailability = useMemo(() => {
    if (heatmapData.length <= 1) return false
    return heatmapData.every((day) => day.count === heatmapData[0].count)
  }, [heatmapData])

  const monthSections = useMemo<MonthSection[]>(() => {
    if (heatmapData.length === 0) return []

    const sections = new Map<string, DayData[]>()

    heatmapData.forEach((day) => {
      const key = `${day.date.getFullYear()}-${day.date.getMonth()}`
      const existing = sections.get(key) ?? []
      existing.push(day)
      sections.set(key, existing)
    })

    return Array.from(sections.entries()).map(([key, days]) => {
      const weeks: DayData[][] = []
      let currentWeek: DayData[] = []
      const firstDayOfMonth = days[0].date.getDay()

      for (let index = 0; index < firstDayOfMonth; index += 1) {
        currentWeek.push({ date: new Date(0), count: -1, total: 0, percentage: 0 })
      }

      days.forEach((day) => {
        currentWeek.push(day)
        if (currentWeek.length === 7) {
          weeks.push(currentWeek)
          currentWeek = []
        }
      })

      if (currentWeek.length > 0) {
        while (currentWeek.length < 7) {
          currentWeek.push({ date: new Date(0), count: -1, total: 0, percentage: 0 })
        }
        weeks.push(currentWeek)
      }

      return {
        key,
        label: days[0].date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        weeks,
      }
    })
  }, [heatmapData])

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

    if (hasUniformAvailability) {
      return pickSpreadWindows(windows)
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
  }, [hasUniformAvailability, heatmapData, participants.length, suggestedDuration])

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
              {hasUniformAvailability && (
                <p className="mb-3 text-xs text-muted-foreground">
                  Availability looks almost the same across this range, so these are spread-out options to compare.
                </p>
              )}
              <div className="space-y-2">
                {bestWindows.map((window, index) => (
                  <button
                    key={`${window.start.toISOString()}-${window.end.toISOString()}`}
                    className={`w-full flex cursor-pointer items-start justify-between gap-3 rounded-lg border px-3 py-2.5 transition-all duration-150 ease-out ${
                      activeWindowKey === getWindowKey(window)
                        ? 'border-primary/60 bg-primary/12 ring-2 ring-primary/20 -translate-y-px shadow-sm'
                        : 'border-transparent bg-muted/30 hover:bg-muted/60 hover:-translate-y-px hover:shadow-sm'
                    }`}
                    onMouseEnter={() => setActiveWindowKey(getWindowKey(window))}
                    onMouseLeave={() => setActiveWindowKey(null)}
                    onClick={() => {
                      setShowCalendar(true)
                      setActiveWindowKey((current) =>
                        current === getWindowKey(window) ? null : getWindowKey(window),
                      )
                    }}
                  >
                    <div className="text-left">
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        {window.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {window.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{window.minAvailable}/{participants.length} available · {suggestedDuration}-day trip</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-primary">#{index + 1}</p>
                      {appliedWindowKey === getWindowKey(window) && (
                        <p className="mt-1 text-[10px] font-semibold text-primary">Selected</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {onApplyWindow && activeWindow && (
                <div className="mt-3 flex justify-end">
                  <Button type="button" size="sm" onClick={() => onApplyWindow(activeWindow)}>
                    Use these dates in Plan
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Monthly availability</p>
                <p className="text-xs text-muted-foreground">
                  Keep the full calendar tucked away unless you need the detailed month-by-month view.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={showCalendar ? 'default' : 'outline'}
                onClick={() => setShowCalendar((current) => !current)}
                className="transition-all duration-150"
              >
                {showCalendar ? 'Hide calendar' : 'Show calendar'}
              </Button>
            </div>
          </div>

          {showCalendar && (
            <>
              <div className="grid gap-4 xl:grid-cols-2">
                {monthSections.map((section) => (
                  <div key={section.key} className="rounded-xl border border-border/50 bg-background p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">{section.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {participants.length} traveler{participants.length === 1 ? '' : 's'}
                      </p>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {dayLabels.map((label, index) => (
                        <div key={`${section.key}-${label}-${index}`} className="text-center text-[11px] font-medium text-muted-foreground">
                          {label}
                        </div>
                      ))}
                    </div>

                    <div className="mt-2 flex flex-col gap-1">
                      {section.weeks.map((week, weekIndex) => (
                        <div key={`${section.key}-week-${weekIndex}`} className="grid grid-cols-7 gap-1">
                          {week.map((day, dayIndex) => {
                            if (day.count === -1) {
                              return <div key={`${section.key}-empty-${weekIndex}-${dayIndex}`} className="aspect-square rounded-sm" />
                            }

                            const isHighlighted =
                              activeWindow &&
                              day.date >= activeWindow.start &&
                              day.date <= activeWindow.end

                            return (
                              <div
                                key={`${section.key}-${day.date.toISOString()}`}
                                className={`relative flex aspect-square min-h-9 items-center justify-center rounded-md border text-[11px] font-medium transition-all duration-150 ease-out cursor-default ${
                                  isHighlighted ? 'border-primary/60 ring-2 ring-primary/25 -translate-y-px shadow-sm' : 'border-transparent'
                                } ${getIntensityClass(day.percentage, hasUniformAvailability)} ${
                                  day.percentage >= 75 && !hasUniformAvailability ? 'text-primary-foreground' : 'text-foreground/80'
                                }`}
                                title={`${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${day.count}/${day.total} available`}
                              >
                                {day.date.getDate()}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-border/40 pt-2">
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
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function getWindowKey(window: { start: Date; end: Date }) {
  return `${window.start.toISOString()}-${window.end.toISOString()}`
}

function pickSpreadWindows(windows: DateRangeOption[]) {
  if (windows.length <= 3) {
    return windows
  }

  const candidateIndexes = [0, Math.floor((windows.length - 1) / 2), windows.length - 1]
  const spread = candidateIndexes.map((index) => windows[index])
  const distinct: DateRangeOption[] = []

  for (const window of spread) {
    const overlapsExisting = distinct.some((existing) => {
      return window.start <= existing.end && window.end >= existing.start
    })

    if (!overlapsExisting) {
      distinct.push(window)
    }
  }

  if (distinct.length >= 2) {
    return distinct
  }

  return windows.filter((window, index) => index % Math.max(1, Math.floor(windows.length / 3)) === 0).slice(0, 3)
}
