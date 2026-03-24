'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, ChevronDown, MapPin, Users } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { parseStoredDate, toDateOnlyString } from '@/lib/date-utils'
import type { AvailabilitySpan, BestDateWindow } from '@/lib/availability'
import type { TripWithResponses, TripPlanRecord } from '@/lib/trip-types'

interface TripSnapshotProps {
  trip: TripWithResponses
  plan: TripPlanRecord
  topDestinations?: Array<{ label: string; count: number }>
  suggestedWindows?: BestDateWindow[]
  sharedAvailabilitySpans?: AvailabilitySpan[]
  selectedTripLengthDays?: number
  maxTripLengthDays?: number
  onTripLengthChange?: (days: number) => void
  onSelectDestination?: (value: string) => void
  onSelectDates?: (startDate: string, endDate: string) => void
}

export function TripSnapshot({
  trip,
  plan,
  topDestinations = [],
  suggestedWindows = [],
  sharedAvailabilitySpans = [],
  selectedTripLengthDays,
  maxTripLengthDays,
  onTripLengthChange,
  onSelectDestination,
  onSelectDates,
}: TripSnapshotProps) {
  const [activeEditor, setActiveEditor] = useState<'destination' | 'dates' | null>(null)
  const formatDate = (date: string | null) => {
    if (!date) return '—'
    return parseStoredDate(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const [customStartDate, setCustomStartDate] = useState('')
  const [manualStartDate, setManualStartDate] = useState('')
  const [manualEndDate, setManualEndDate] = useState('')

  const eligibleSharedSpan = useMemo(() => {
    if (!selectedTripLengthDays) return null
    return (
      sharedAvailabilitySpans.find((span) => {
        const spanDays =
          Math.floor(
            (parseStoredDate(span.endDate).getTime() - parseStoredDate(span.startDate).getTime()) / (1000 * 60 * 60 * 24),
          ) + 1
        return spanDays >= selectedTripLengthDays
      }) ?? null
    )
  }, [selectedTripLengthDays, sharedAvailabilitySpans])

  useEffect(() => {
    setManualStartDate(plan.finalStartDate ? toDateOnlyString(parseStoredDate(plan.finalStartDate)) : '')
    setManualEndDate(plan.finalEndDate ? toDateOnlyString(parseStoredDate(plan.finalEndDate)) : '')
  }, [plan.finalEndDate, plan.finalStartDate])

  useEffect(() => {
    if (!eligibleSharedSpan) {
      setCustomStartDate('')
      return
    }

    const currentStart = plan.finalStartDate ? toDateOnlyString(parseStoredDate(plan.finalStartDate)) : ''
    if (currentStart && currentStart >= eligibleSharedSpan.startDate && currentStart <= eligibleSharedSpan.endDate) {
      setCustomStartDate(currentStart)
      return
    }

    setCustomStartDate(eligibleSharedSpan.startDate)
  }, [eligibleSharedSpan, plan.finalStartDate])

  const customEndDate = useMemo(() => {
    if (!customStartDate || !selectedTripLengthDays) return ''
    const end = parseStoredDate(customStartDate)
    end.setDate(end.getDate() + selectedTripLengthDays - 1)
    return toDateOnlyString(end)
  }, [customStartDate, selectedTripLengthDays])

  const latestCustomStartDate = useMemo(() => {
    if (!eligibleSharedSpan || !selectedTripLengthDays) return ''
    const latest = parseStoredDate(eligibleSharedSpan.endDate)
    latest.setDate(latest.getDate() - selectedTripLengthDays + 1)
    return toDateOnlyString(latest)
  }, [eligibleSharedSpan, selectedTripLengthDays])

  return (
    <div className="featured-card relative overflow-hidden rounded-2xl border border-accent/15 bg-gradient-to-br from-accent/8 via-card to-primary/5 p-6">
      <div className="absolute inset-0 pointer-events-none rounded-2xl">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-gradient-radial from-accent/10 to-transparent opacity-40 blur-3xl" />
      </div>

      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-widest text-accent">Lock in the trip</span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-6">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trip name</p>
            <h3 className="text-lg font-bold text-foreground leading-tight">{trip.name}</h3>
          </div>

          <button
            type="button"
            onClick={() => setActiveEditor((current) => (current === 'destination' ? null : 'destination'))}
            className={`flex flex-col gap-1 rounded-xl border px-3 py-3 text-left transition ${
              activeEditor === 'destination'
                ? 'border-primary/50 bg-primary/8'
                : 'border-transparent hover:border-border/60 hover:bg-background/60'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Destination</p>
              </div>
              <ChevronDown
                className={`size-4 text-muted-foreground transition-transform ${
                  activeEditor === 'destination' ? 'rotate-180' : ''
                }`}
              />
            </div>
            <p className="text-lg font-bold text-foreground">{plan.finalDestination || 'Not chosen yet'}</p>
          </button>

          <button
            type="button"
            onClick={() => setActiveEditor((current) => (current === 'dates' ? null : 'dates'))}
            className={`flex flex-col gap-1 rounded-xl border px-3 py-3 text-left transition ${
              activeEditor === 'dates'
                ? 'border-primary/50 bg-primary/8'
                : 'border-transparent hover:border-border/60 hover:bg-background/60'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dates</p>
              </div>
              <ChevronDown
                className={`size-4 text-muted-foreground transition-transform ${
                  activeEditor === 'dates' ? 'rotate-180' : ''
                }`}
              />
            </div>
            <p className="text-lg font-bold text-foreground">
              {plan.finalStartDate && plan.finalEndDate
                ? `${formatDate(plan.finalStartDate)} – ${formatDate(plan.finalEndDate)}`
                : 'Not chosen yet'}
            </p>
          </button>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-accent" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Responses in</p>
            </div>
            <p className="text-lg font-bold text-foreground">
              {trip.responses?.length || 0} {trip.responses?.length === 1 ? 'person' : 'people'}
            </p>
          </div>
        </div>

        {activeEditor === 'destination' && (
          <div className="space-y-3 rounded-2xl border border-border/60 bg-background/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">Pick the destination</p>
              {topDestinations[0] && <p className="text-xs text-muted-foreground">Based on group votes</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {topDestinations.length > 0 ? (
                topDestinations.slice(0, 4).map((destination) => {
                  const isActive = plan.finalDestination === destination.label
                  return (
                    <Button
                      key={destination.label}
                      type="button"
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        onSelectDestination?.(destination.label)
                        setActiveEditor(null)
                      }}
                    >
                      {destination.label}
                      <span className="ml-1 text-[11px] opacity-80">{destination.count}</span>
                    </Button>
                  )
                })
              ) : (
                <p className="text-sm text-muted-foreground">Destination votes will show up here once people respond.</p>
              )}
            </div>
          </div>
        )}

        {activeEditor === 'dates' && (
          <div className="space-y-4 rounded-2xl border border-border/60 bg-background/70 p-4">
            <div className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">Choose the trip length</p>
                {selectedTripLengthDays && (
                  <span className="text-sm font-semibold text-primary">{selectedTripLengthDays} days</span>
                )}
              </div>
              {selectedTripLengthDays && maxTripLengthDays && onTripLengthChange ? (
                <>
                  <Slider
                    value={[selectedTripLengthDays]}
                    onValueChange={(value) => onTripLengthChange(value[0])}
                    min={1}
                    max={maxTripLengthDays}
                    step={1}
                    className="[&_[role=slider]]:border-2 [&_[role=slider]]:border-primary-foreground [&_[role=slider]]:bg-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 day</span>
                    <span>{maxTripLengthDays} days</span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Trip length suggestions will show up once responses are in.</p>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-border/60 bg-background/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Suggested date blocks</p>
                  <p className="text-xs text-muted-foreground">Quick picks based on the trip length above.</p>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {suggestedWindows.length > 0 ? (
                  suggestedWindows.map((window) => {
                    const isActive =
                      plan.finalStartDate === window.startDate && plan.finalEndDate === window.endDate

                    return (
                      <button
                        key={`${window.startDate}-${window.endDate}`}
                        type="button"
                        onClick={() => {
                          onSelectDates?.(window.startDate, window.endDate)
                          setActiveEditor(null)
                        }}
                        className={`rounded-xl border px-4 py-3 text-left transition ${
                          isActive
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border/60 bg-background hover:border-primary/50 hover:bg-primary/5'
                        }`}
                      >
                        <p className="text-sm font-semibold text-foreground">
                          {formatDate(window.startDate)} – {formatDate(window.endDate)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {window.minAvailable}/{trip.responses.length} people available
                        </p>
                      </button>
                    )
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">Once a few people submit availability, date suggestions will show up here.</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-sm font-semibold text-foreground">Pick any dates inside the shared window</p>
                {eligibleSharedSpan && selectedTripLengthDays ? (
                  <>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Everyone is free from {formatDate(eligibleSharedSpan.startDate)} – {formatDate(eligibleSharedSpan.endDate)}.
                      Pick any start date inside that range for a {selectedTripLengthDays}-day trip.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                      <label className="flex-1 text-sm text-foreground">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start date</span>
                        <input
                          type="date"
                          value={customStartDate}
                          min={eligibleSharedSpan.startDate}
                          max={latestCustomStartDate}
                          onChange={(event) => setCustomStartDate(event.target.value)}
                          className="flex h-10 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm shadow-sm"
                        />
                      </label>
                      <div className="flex-1 text-sm text-foreground">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">This would end on</span>
                        <div className="flex h-10 items-center rounded-md border border-border/60 bg-muted/30 px-3 text-sm">
                          {customEndDate ? formatDate(customEndDate) : '—'}
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          if (customStartDate && customEndDate) {
                            onSelectDates?.(customStartDate, customEndDate)
                            setActiveEditor(null)
                          }
                        }}
                        disabled={!customStartDate || !customEndDate}
                      >
                        Use these dates
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    If the group ends up sharing a bigger availability span, you’ll be able to pick any start date inside it here.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <p className="text-sm font-semibold text-foreground">Manual override</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Want specific dates even if they are not one of the suggested blocks? Set them directly here.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm text-foreground">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start date</span>
                    <input
                      type="date"
                      value={manualStartDate}
                      onChange={(event) => setManualStartDate(event.target.value)}
                      className="flex h-10 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm shadow-sm"
                    />
                  </label>
                  <label className="text-sm text-foreground">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">End date</span>
                    <input
                      type="date"
                      value={manualEndDate}
                      onChange={(event) => setManualEndDate(event.target.value)}
                      className="flex h-10 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm shadow-sm"
                    />
                  </label>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (manualStartDate && manualEndDate) {
                        onSelectDates?.(manualStartDate, manualEndDate)
                        setActiveEditor(null)
                      }
                    }}
                    disabled={!manualStartDate || !manualEndDate}
                  >
                    Use custom dates
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          <p>Lock in the destination and dates here, then use the shared trip doc below to collect housing, food, and activity ideas.</p>
        </div>
      </div>
    </div>
  )
}
