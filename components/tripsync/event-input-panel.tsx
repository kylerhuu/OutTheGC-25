'use client'

import { useState, useEffect } from 'react'
import { DateRange } from 'react-day-picker'
import { Plus, X, Eye, Pencil } from 'lucide-react'
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

const DESTINATION_SUGGESTIONS = [
  'Barcelona', 'Lisbon', 'Tokyo', 'Bali', 'Iceland', 'Costa Rica', 'Portugal', 'Greece'
]

const INTEREST_OPTIONS = [
  { id: 'beach', label: 'Beach' },
  { id: 'mountains', label: 'Mountains' },
  { id: 'city', label: 'City' },
  { id: 'culture', label: 'Culture' },
  { id: 'food', label: 'Food & Dining' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'nightlife', label: 'Nightlife' },
  { id: 'nature', label: 'Nature' },
]

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
  onSubmit: (input: UserInput) => void
  hasSubmitted?: boolean
  editingParticipant?: ParticipantData | null
  onEditSubmission?: () => void
  onViewCalendar?: () => void
}

export function EventInputPanel({ 
  tripDateRange, 
  onSubmit, 
  hasSubmitted = false,
  editingParticipant,
  onEditSubmission,
  onViewCalendar
}: EventInputPanelProps) {
  const [name, setName] = useState('')
  const [availability, setAvailability] = useState<DateRange | undefined>(undefined)
  const [destinations, setDestinations] = useState<string[]>([])
  const [customDestination, setCustomDestination] = useState('')
  const [budget, setBudget] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [editCode, setEditCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      setInterests(editingParticipant.interests)
      setNotes(editingParticipant.notes || '')
      setEditCode(editingParticipant.editCode || '')
    } else {
      // Reset form
      setName('')
      setAvailability(undefined)
      setDestinations([])
      setBudget('')
      setInterests([])
      setNotes('')
      setEditCode('')
    }
  }, [editingParticipant])

  const addDestination = (dest: string) => {
    const trimmed = dest.trim()
    if (trimmed && !destinations.includes(trimmed)) {
      setDestinations([...destinations, trimmed])
    }
    setCustomDestination('')
  }

  const removeDestination = (dest: string) => {
    setDestinations(destinations.filter(d => d !== dest))
  }

  const toggleInterest = (interestId: string) => {
    setInterests(prev =>
      prev.includes(interestId)
        ? prev.filter(i => i !== interestId)
        : [...prev, interestId]
    )
  }

  const handleSubmit = async () => {
    if (!name.trim()) return
    
    setIsSubmitting(true)
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800))
    
    onSubmit({
      name,
      availability,
      destinations,
      budget,
      interests,
      notes,
      editCode: editCode || undefined,
    })
    setIsSubmitting(false)
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
            Thanks for sharing! Your preferences are helping plan the perfect trip.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            {onEditSubmission && (
              <Button
                variant="outline"
                onClick={onEditSubmission}
                className="flex-1 gap-2"
              >
                <Pencil className="size-4" />
                Edit My Submission
              </Button>
            )}
            {onViewCalendar && (
              <Button
                variant="default"
                onClick={onViewCalendar}
                className="flex-1 gap-2"
              >
                <Eye className="size-4" />
                View Calendar
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
            : 'Tell us when you\'re available and what you\'d like to do'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
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
              Remember this code to edit your submission later
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

        {/* Destinations */}
        <div className="flex flex-col gap-3 pt-2">
          <Label className="text-sm font-medium">Destination Ideas</Label>
          <div className="flex flex-wrap gap-2">
            {DESTINATION_SUGGESTIONS.map(dest => (
              <Badge
                key={dest}
                variant={destinations.includes(dest) ? 'default' : 'outline'}
                className={`cursor-pointer transition-all text-xs font-medium py-1 px-3 ${
                  destinations.includes(dest)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:border-primary/50'
                }`}
                onClick={() => 
                  destinations.includes(dest) 
                    ? removeDestination(dest) 
                    : addDestination(dest)
                }
              >
                {dest}
                {destinations.includes(dest) && (
                  <X className="size-3 ml-1.5" />
                )}
              </Badge>
            ))}
          </div>
          
          {/* Custom destination input - always visible */}
          <div className="flex gap-2 mt-1">
            <Input
              placeholder="Add custom destination"
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

          {/* Show custom destinations that aren't in suggestions */}
          {destinations.filter(d => !DESTINATION_SUGGESTIONS.includes(d)).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {destinations.filter(d => !DESTINATION_SUGGESTIONS.includes(d)).map(dest => (
                <Badge
                  key={dest}
                  variant="default"
                  className="cursor-pointer transition-all text-xs font-medium py-1 px-3 bg-primary text-primary-foreground border-primary"
                  onClick={() => removeDestination(dest)}
                >
                  {dest}
                  <X className="size-3 ml-1.5" />
                </Badge>
              ))}
            </div>
          )}
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
          <Label className="text-sm font-medium">Trip Interests</Label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map(interest => (
              <Toggle
                key={interest.id}
                variant="outline"
                size="sm"
                pressed={interests.includes(interest.id)}
                onPressedChange={() => toggleInterest(interest.id)}
                className={`text-xs font-medium transition-colors ${
                  interests.includes(interest.id)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'hover:border-primary/50'
                }`}
              >
                {interest.label}
              </Toggle>
            ))}
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
      </CardContent>
    </Card>
  )
}
