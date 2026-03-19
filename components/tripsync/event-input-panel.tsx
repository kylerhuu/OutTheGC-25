'use client'

import { useState } from 'react'
import { DateRange } from 'react-day-picker'
import { Plus, X } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Toggle } from '@/components/ui/toggle'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'

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
}

interface EventInputPanelProps {
  tripDateRange: { from: Date; to: Date }
  onSubmit: (input: UserInput) => void
  hasSubmitted?: boolean
}

export function EventInputPanel({ tripDateRange, onSubmit, hasSubmitted = false }: EventInputPanelProps) {
  const [name, setName] = useState('')
  const [availability, setAvailability] = useState<DateRange | undefined>(undefined)
  const [destinations, setDestinations] = useState<string[]>([])
  const [customDestination, setCustomDestination] = useState('')
  const [budget, setBudget] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addDestination = (dest: string) => {
    if (dest && !destinations.includes(dest)) {
      setDestinations([...destinations, dest])
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
    })
    setIsSubmitting(false)
  }

  const isValid = name.trim().length > 0

  if (hasSubmitted) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg className="size-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Response Submitted</h3>
          <p className="text-muted-foreground text-sm">
            Thanks for sharing your preferences! The summary will update as others respond.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg">Share Your Preferences</CardTitle>
        <CardDescription>Help plan the perfect trip by sharing your availability and ideas</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {/* Name */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Your Name</Label>
          <Input
            id="name"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Availability Calendar */}
        <div className="flex flex-col gap-2">
          <Label>Your Availability</Label>
          <p className="text-sm text-muted-foreground">Select the dates you can travel</p>
          <div className="border border-border rounded-lg p-2 bg-background overflow-hidden">
            <Calendar
              mode="range"
              selected={availability}
              onSelect={setAvailability}
              disabled={{ before: tripDateRange.from, after: tripDateRange.to }}
              defaultMonth={tripDateRange.from}
              numberOfMonths={1}
            />
          </div>
        </div>

        {/* Destinations */}
        <div className="flex flex-col gap-2">
          <Label>Destination Ideas</Label>
          <div className="flex flex-wrap gap-2">
            {DESTINATION_SUGGESTIONS.map(dest => (
              <Badge
                key={dest}
                variant={destinations.includes(dest) ? 'default' : 'outline'}
                className="cursor-pointer transition-colors"
                onClick={() => 
                  destinations.includes(dest) 
                    ? removeDestination(dest) 
                    : addDestination(dest)
                }
              >
                {dest}
                {destinations.includes(dest) && (
                  <X className="size-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Add custom destination"
              value={customDestination}
              onChange={(e) => setCustomDestination(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDestination(customDestination)}
              className="flex-1"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => addDestination(customDestination)}
              disabled={!customDestination.trim()}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        {/* Budget */}
        <div className="flex flex-col gap-2">
          <Label>Budget Range</Label>
          <Select value={budget} onValueChange={setBudget}>
            <SelectTrigger className="w-full">
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
        <div className="flex flex-col gap-2">
          <Label>Trip Interests</Label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map(interest => (
              <Toggle
                key={interest.id}
                variant="outline"
                size="sm"
                pressed={interests.includes(interest.id)}
                onPressedChange={() => toggleInterest(interest.id)}
              >
                {interest.label}
              </Toggle>
            ))}
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          className="w-full mt-2"
        >
          {isSubmitting ? (
            <>
              <Spinner className="size-4 mr-2" />
              Submitting...
            </>
          ) : (
            'Submit Response'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
