'use client'

import { useState, useEffect, useMemo } from 'react'
import { DateRange } from 'react-day-picker'
import { ArrowRight, Plus, X, Eye, Pencil } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Toggle } from '@/components/ui/toggle'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import type { ParticipantData } from '@/app/event/[tripId]/page'

const INTEREST_OPTIONS = [
  { id: 'beach', label: 'Beach' },
  { id: 'mountains', label: 'Mountains' },
  { id: 'city', label: 'City' },
  { id: 'culture', label: 'Culture' },
  { id: 'food', label: 'Food & Dining' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'nightlife', label: 'Nightlife' },
  { id: 'nature', label: 'Nature' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'relaxation', label: 'Relaxation' },
  { id: 'wellness', label: 'Wellness & Spa' },
  { id: 'museums', label: 'Museums & History' },
  { id: 'music', label: 'Live Music' },
  { id: 'roadtrip', label: 'Road Trip' },
  { id: 'photography', label: 'Scenic Views' },
  { id: 'sports', label: 'Sports & Games' },
]

const INTEREST_LABELS = Object.fromEntries(
  INTEREST_OPTIONS.map((option) => [option.id, option.label]),
) as Record<string, string>

const BUDGET_OPTIONS = [
  { value: 'budget', label: 'Budget ($)' },
  { value: 'moderate', label: 'Moderate ($$)' },
  { value: 'comfortable', label: 'Comfortable ($$$)' },
  { value: 'luxury', label: 'Luxury ($$$$)' },
]

interface UserInput {
  name: string
  availability: DateRange | undefined
  destinations: string[]
  budget: string
  interests: string[]
  notes?: string
  editCode?: string
}

interface EventInputPanelProps {
  tripDateRange: { from: Date; to: Date }
  destinationOptions: string[]
  interestOptions: string[]
  onSubmit: (input: UserInput) => Promise<void>
  onRecoverSubmission: (input: { name: string; editCode: string }) => Promise<void>
  hasSubmitted?: boolean
  editingParticipant?: ParticipantData | null
  onEditSubmission?: () => void
  onViewResults?: () => void
  onGoToPlanning?: () => void
  savedEditCode?: string | null
}

export function EventInputPanel({ 
  tripDateRange, 
  destinationOptions,
  interestOptions,
  onSubmit, 
  onRecoverSubmission,
  hasSubmitted = false,
  editingParticipant,
  onEditSubmission,
  onViewResults,
  onGoToPlanning,
  savedEditCode,
}: EventInputPanelProps) {
  const resolveInterestValue = (interest: string) => INTEREST_LABELS[interest] || interest
  const [name, setName] = useState('')
  const [availability, setAvailability] = useState<DateRange | undefined>(undefined)
  const [destinations, setDestinations] = useState<string[]>([])
  const [customDestination, setCustomDestination] = useState('')
  const [budget, setBudget] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [customInterest, setCustomInterest] = useState('')
  const [notes, setNotes] = useState('')
  const [editCode, setEditCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [recoveryOpen, setRecoveryOpen] = useState(false)
  const [recoveryName, setRecoveryName] = useState('')
  const [recoveryEditCode, setRecoveryEditCode] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [isRecovering, setIsRecovering] = useState(false)

  const normalizedDestinationOptions = useMemo(() => {
    const seen = new Set<string>()
    const merged: string[] = []

    for (const destination of [...destinationOptions, ...destinations]) {
      const trimmed = destination.trim().replace(/\s+/g, ' ')
      const normalized = trimmed.toLowerCase()

      if (!trimmed || seen.has(normalized)) continue

      seen.add(normalized)
      merged.push(trimmed)
    }

    return merged
  }, [destinationOptions, destinations])

  const normalizedInterestOptions = useMemo(() => {
    const seen = new Set<string>()
    const merged: string[] = []

    for (const interest of [...interestOptions, ...interests]) {
      const trimmed = resolveInterestValue(interest).trim().replace(/\s+/g, ' ')
      const normalized = trimmed.toLowerCase()

      if (!trimmed || seen.has(normalized)) continue

      seen.add(normalized)
      merged.push(trimmed)
    }

    return merged
  }, [interestOptions, interests])

  // Populate form when editing
  useEffect(() => {
    if (editingParticipant) {
      setName(editingParticipant.name)
      setAvailability(
        editingParticipant.availability 
          ? { from: editingParticipant.availability.from, to: editingParticipant.availability.to }
          : undefined
      )
      setDestinations(editingParticipant.destinations)
      setBudget(editingParticipant.budget)
      setInterests(editingParticipant.interests.map(resolveInterestValue))
      setNotes(editingParticipant.notes || '')
    } else {
      // Reset form
      setName('')
      setAvailability(undefined)
      setDestinations([])
      setBudget('')
      setInterests([])
      setCustomInterest('')
      setNotes('')
      setEditCode('')
    }
    setSubmitError('')
    setRecoveryError('')
  }, [editingParticipant])

  const addDestination = (dest: string) => {
    const trimmed = dest.trim().replace(/\s+/g, ' ')
    const normalized = trimmed.toLowerCase()

    if (trimmed && !destinations.some((item) => item.trim().toLowerCase() === normalized)) {
      setDestinations([...destinations, trimmed])
    }
    setCustomDestination('')
  }

  const removeDestination = (dest: string) => {
    const normalized = dest.trim().toLowerCase()
    setDestinations(destinations.filter(d => d.trim().toLowerCase() !== normalized))
  }

  const isDestinationSelected = (dest: string) =>
    destinations.some((item) => item.trim().toLowerCase() === dest.trim().toLowerCase())

  const toggleInterest = (interestId: string) => {
    const resolvedInterest = resolveInterestValue(interestId)

    setInterests(prev =>
      prev.some((item) => resolveInterestValue(item).toLowerCase() === resolvedInterest.toLowerCase())
        ? prev.filter((item) => resolveInterestValue(item).toLowerCase() !== resolvedInterest.toLowerCase())
        : [...prev, resolvedInterest]
    )
  }

  const addInterest = (interest: string) => {
    const trimmed = interest.trim().replace(/\s+/g, ' ')
    const normalized = trimmed.toLowerCase()

    if (trimmed && !interests.some((item) => item.trim().toLowerCase() === normalized)) {
      setInterests([...interests, trimmed])
    }

    setCustomInterest('')
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    if (availability && (!availability.from || !availability.to)) {
      setSubmitError('Please select a complete availability range or clear it.')
      return
    }
    
    setIsSubmitting(true)
    setSubmitError('')

    try {
      await onSubmit({
        name,
        availability,
        destinations,
        budget,
        interests,
        notes,
        editCode: editCode || undefined,
      })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save your response.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRecover = async () => {
    if (!recoveryName.trim()) {
      setRecoveryError('Enter your name to recover your response.')
      return
    }

    setIsRecovering(true)
    setRecoveryError('')

    try {
      await onRecoverSubmission({
        name: recoveryName,
        editCode: recoveryEditCode,
      })
      setRecoveryOpen(false)
      setRecoveryName('')
      setRecoveryEditCode('')
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : 'Unable to recover response.')
    } finally {
      setIsRecovering(false)
    }
  }

  const isValid = name.trim().length > 0

  // Post-submission state with action buttons
  if (hasSubmitted && !editingParticipant) {
    return (
      <Card className="bg-gradient-to-b from-primary/5 to-card border-primary/20">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="size-14 rounded-full bg-primary/15 flex items-center justify-center mb-5">
            <svg className="size-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Response Submitted</h3>
          <p className="text-muted-foreground text-sm max-w-xs mb-6">
            You&apos;re in. Next, either check the group results, tweak your response, or jump into planning.
          </p>

          {savedEditCode && (
            <div className="w-full max-w-sm rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-left mb-6">
              <p className="text-xs font-medium text-muted-foreground mb-1">Your edit code</p>
              <p className="font-mono text-sm text-foreground break-all">{savedEditCode}</p>
            </div>
          )}
          
          <div className="flex flex-col gap-3 w-full max-w-sm">
            {onViewResults && (
              <Button
                variant="default"
                onClick={onViewResults}
                className="w-full gap-2"
              >
                <Eye className="size-4" />
                View Group Results
              </Button>
            )}
            {onEditSubmission && (
              <Button
                variant="outline"
                onClick={onEditSubmission}
                className="w-full gap-2"
              >
                <Pencil className="size-4" />
                Edit My Submission
              </Button>
            )}
            {onGoToPlanning && (
              <Button
                variant="outline"
                onClick={onGoToPlanning}
                className="w-full gap-2"
              >
                <ArrowRight className="size-4" />
                Go To Planning Page
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const isEditMode = !!editingParticipant

  return (
    <Card className="bg-card border-border/60 shadow-sm">
      <CardHeader className="pb-6">
        <CardTitle className="text-2xl font-semibold">
          {isEditMode ? 'Edit Your Response' : 'Share Your Preferences'}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {isEditMode 
            ? 'Update your availability and preferences below'
            : 'Start with the basics, then pick destinations and the kind of trip you want.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        {!isEditMode && (
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <p className="text-sm font-semibold text-foreground">Already answered?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter your name and, if you set one, your edit code to recover your response.
            </p>
            {!recoveryOpen ? (
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => {
                  setRecoveryOpen(true)
                  setRecoveryError('')
                }}
              >
                Recover My Response
              </Button>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <Input
                  placeholder="Your name"
                  value={recoveryName}
                  onChange={(e) => setRecoveryName(e.target.value)}
                />
                <Input
                  placeholder="Edit code (optional)"
                  value={recoveryEditCode}
                  onChange={(e) => setRecoveryEditCode(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button type="button" onClick={handleRecover} disabled={isRecovering}>
                    {isRecovering ? 'Recovering...' : 'Load My Response'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setRecoveryOpen(false)
                      setRecoveryError('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {recoveryError && <p className="text-sm text-destructive">{recoveryError}</p>}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Basics</p>
          <p className="text-xs text-muted-foreground">Who you are, when you&apos;re free, and how to edit later if needed.</p>
        </div>

        {/* Name */}
        <div className="flex flex-col gap-3">
          <Label htmlFor="name" className="text-sm font-medium">Your Name</Label>
          <Input
            id="name"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-10 text-base"
            disabled={isEditMode}
          />
          {isEditMode && (
            <p className="text-xs text-muted-foreground">Name cannot be changed when editing</p>
          )}
        </div>

        {/* Edit Code (only for new submissions) */}
        {!isEditMode && (
          <div className="flex flex-col gap-3">
            <Label htmlFor="editCode" className="text-sm font-medium">
              Edit Code <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="editCode"
              placeholder="Create a code to edit your response later"
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
              className="h-10 text-base"
            />
            <p className="text-xs text-muted-foreground">
              Leave this blank if you do not want to use an edit code
            </p>
          </div>
        )}

        {/* Availability Calendar */}
        <div className="flex flex-col gap-3 pt-2">
          <div>
            <Label className="text-sm font-medium block mb-1">Your Availability</Label>
            <p className="text-xs text-muted-foreground">Select when you can travel</p>
          </div>
          <div className="border border-border/60 rounded-xl p-4 bg-card/50 overflow-hidden shadow-sm">
            <Calendar
              mode="range"
              selected={availability}
              onSelect={setAvailability}
              disabled={{ before: tripDateRange.from, after: tripDateRange.to }}
              defaultMonth={tripDateRange.from}
              numberOfMonths={1}
              className="w-full [&_.rdp]:w-full [&_.rdp_cell]:w-1/7"
            />
          </div>
          {availability?.from && availability?.to && (
            <div className="flex items-center gap-2 text-sm text-primary font-medium bg-primary/5 px-3 py-2 rounded-lg">
              <svg className="size-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
              {availability.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {availability.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>

        <div className="space-y-1 border-t border-border/50 pt-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Where should the trip be?</p>
          <p className="text-xs text-muted-foreground">Choose possible destinations for the group, not activities within that place.</p>
        </div>

        {/* Destinations */}
        <div className="flex flex-col gap-3 pt-2">
          <Label className="text-sm font-medium">Destination Options</Label>
          <div className="flex flex-wrap gap-2">
            {normalizedDestinationOptions.map(dest => (
              <Badge
                key={dest}
                variant={isDestinationSelected(dest) ? 'default' : 'outline'}
                className={`cursor-pointer transition-all text-xs font-medium py-1 px-3 ${
                  isDestinationSelected(dest)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => 
                  isDestinationSelected(dest) 
                    ? removeDestination(dest) 
                    : addDestination(dest)
                }
              >
                {dest}
                {isDestinationSelected(dest) && (
                  <X className="size-3 ml-1.5" />
                )}
              </Badge>
            ))}
          </div>
          
          {/* Custom destination input - always visible */}
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="Add another place to consider"
              value={customDestination}
              onChange={(e) => setCustomDestination(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addDestination(customDestination)
                }
              }}
              className="flex-1 h-9 text-sm"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => addDestination(customDestination)}
              disabled={!customDestination.trim()}
              className="gap-1"
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>

        </div>

        <div className="space-y-1 border-t border-border/50 pt-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What kind of trip do you want?</p>
          <p className="text-xs text-muted-foreground">Pick the vibe and activities you care about once you get there.</p>
        </div>

        {/* Budget */}
        <div className="flex flex-col gap-3 pt-2">
          <Label className="text-sm font-medium">Budget Range</Label>
          <Select value={budget} onValueChange={setBudget}>
            <SelectTrigger className="h-10 text-base border-border/60">
              <SelectValue placeholder="Select your budget" />
            </SelectTrigger>
            <SelectContent>
              {BUDGET_OPTIONS.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Interests */}
        <div className="flex flex-col gap-3 pt-2">
          <Label className="text-sm font-medium">Trip Vibe & Activities</Label>
          <div className="flex flex-wrap gap-2">
            {normalizedInterestOptions.map(interest => (
              <Toggle
                key={interest}
                variant="outline"
                size="sm"
                pressed={interests.some((item) => item.trim().toLowerCase() === interest.trim().toLowerCase())}
                onPressedChange={() => toggleInterest(interest)}
                className={`text-xs font-medium transition-colors ${
                  interests.some((item) => item.trim().toLowerCase() === interest.trim().toLowerCase())
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:border-primary/50'
                }`}
              >
                {resolveInterestValue(interest)}
              </Toggle>
            ))}
          </div>
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="Add another trip vibe or activity"
              value={customInterest}
              onChange={(e) => setCustomInterest(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addInterest(customInterest)
                }
              }}
              className="flex-1 h-9 text-sm"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => addInterest(customInterest)}
              disabled={!customInterest.trim()}
              className="gap-1"
            >
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-3 pt-2">
          <Label htmlFor="notes" className="text-sm font-medium">
            Notes <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="notes"
            placeholder="Any additional preferences or constraints..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="min-h-[80px] text-base resize-none"
          />
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          className="w-full mt-6 h-11 font-medium text-base"
        >
          {isSubmitting ? (
            <>
              <Spinner className="size-4 mr-2" />
              {isEditMode ? 'Updating...' : 'Submitting...'}
            </>
          ) : (
            isEditMode ? 'Update Response' : 'Submit Response'
          )}
        </Button>

        {submitError && (
          <p className="text-sm text-destructive">{submitError}</p>
        )}

        {!submitError && !availability?.to && availability?.from && (
          <p className="text-xs text-muted-foreground">Pick an end date to save an availability range.</p>
        )}
      </CardContent>
    </Card>
  )
}
