'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Calendar, CheckSquare, Loader2, MapPin, NotebookPen, Plane, Sparkles, Wallet } from 'lucide-react'
import { EventTopBar } from '@/components/tripsync/event-top-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import type {
  TripPlanPageData,
  TripPlanRecord,
  TripPlanTodoRecord,
  UpdateTripPlanInput,
} from '@/lib/trip-types'

interface PlanPayload extends Partial<TripPlanPageData> {
  error?: string
}

interface PlanSavePayload {
  plan?: TripPlanRecord
  error?: string
}

interface TodoPayload {
  todo?: TripPlanTodoRecord
  error?: string
}

const BUDGET_LABELS: Record<string, string> = {
  budget: 'Budget ($)',
  moderate: 'Moderate ($$)',
  comfortable: 'Comfortable ($$$)',
  luxury: 'Luxury ($$$$)',
}

const INTEREST_LABELS: Record<string, string> = {
  beach: 'Beach',
  mountains: 'Mountains',
  city: 'City',
  culture: 'Culture',
  food: 'Food & Dining',
  adventure: 'Adventure',
  nightlife: 'Nightlife',
  nature: 'Nature',
}

const SECTION_PLACEHOLDERS = {
  itineraryIdeas:
    'Arrival day\n- Where do we want to start?\n\nMain trip ideas\n- Must-do spots or activities\n\nFlexible/free day\n- Open time for wandering or resting',
  lodgingNotes:
    'Neighborhoods to consider\n- \n\nPrice range\n- \n\nMust-haves\n- Kitchen, walkability, pool, extra beds...',
  transportationNotes:
    'Getting there\n- Flights or driving plan\n\nArrival timing\n- \n\nLocal transportation\n- Train, rental car, rideshare, walking...',
  budgetNotes:
    'Estimated cost per person\n- \n\nShared expenses\n- Lodging, transport, tickets\n\nWhat still needs booking\n- ',
  groupNotes:
    'Open questions\n- \n\nThings to remember\n- \n\nAnything the group still needs to decide\n- ',
}

function formatDateRange(from: Date, to: Date) {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  return `${from.toLocaleDateString('en-US', options)} - ${to.toLocaleDateString('en-US', options)}`
}

function formatShortDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function toDateInputValue(value: string | null) {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

function fromDateInputValue(value: string) {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null
}

export default function PlanPage() {
  const params = useParams()
  const tripId = params.tripId as string
  const [data, setData] = useState<TripPlanPageData | null>(null)
  const [draft, setDraft] = useState<UpdateTripPlanInput | null>(null)
  const [newTodo, setNewTodo] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [todoError, setTodoError] = useState<string | null>(null)
  const [isAddingTodo, setIsAddingTodo] = useState(false)
  const [busyTodoId, setBusyTodoId] = useState<string | null>(null)

  const loadPlan = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const response = await fetch(`/api/trips/${tripId}/plan`, { cache: 'no-store' })
      const payload = (await response.json()) as PlanPayload

      if (!response.ok || !payload.trip || !payload.plan || !payload.suggestions) {
        throw new Error(payload.error || 'Unable to load planning board.')
      }

      setData({
        trip: payload.trip,
        plan: payload.plan,
        suggestions: payload.suggestions,
      })
      setDraft({
        finalDestination: payload.plan.finalDestination,
        finalStartDate: payload.plan.finalStartDate,
        finalEndDate: payload.plan.finalEndDate,
        itineraryIdeas: payload.plan.itineraryIdeas,
        lodgingNotes: payload.plan.lodgingNotes,
        transportationNotes: payload.plan.transportationNotes,
        budgetNotes: payload.plan.budgetNotes,
        groupNotes: payload.plan.groupNotes,
      })
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load planning board.')
    } finally {
      setIsLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    void loadPlan()
  }, [loadPlan])

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return `${process.env.NEXT_PUBLIC_BASE_URL || 'https://outthegc.app'}/plan/${tripId}`
    }

    return `${window.location.origin}/plan/${tripId}`
  }, [tripId])

  const summary = useMemo(() => {
    if (!data) return null

    return {
      topDestination: data.suggestions.topDestinations[0]?.label || 'Still deciding',
      strongestWindow: data.suggestions.bestDateWindows[0]
        ? formatShortDateRange(
            data.suggestions.bestDateWindows[0].startDate,
            data.suggestions.bestDateWindows[0].endDate,
          )
        : 'Waiting on more availability',
    }
  }, [data])

  const handleDraftChange = <K extends keyof UpdateTripPlanInput>(key: K, value: UpdateTripPlanInput[K]) => {
    setDraft((current) => ({
      ...(current || {}),
      [key]: value,
    }))
    setSaveMessage(null)
    setSaveError(null)
  }

  const handleSavePlan = async () => {
    if (!draft) return

    setIsSaving(true)
    setSaveError(null)
    setSaveMessage(null)

    try {
      const response = await fetch(`/api/trips/${tripId}/plan`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draft),
      })

      const payload = (await response.json()) as PlanSavePayload

      if (!response.ok || !payload.plan) {
        throw new Error(payload.error || 'Unable to save plan.')
      }

      setData((current) =>
        current
          ? {
              ...current,
              plan: payload.plan!,
            }
          : current,
      )
      setDraft({
        finalDestination: payload.plan.finalDestination,
        finalStartDate: payload.plan.finalStartDate,
        finalEndDate: payload.plan.finalEndDate,
        itineraryIdeas: payload.plan.itineraryIdeas,
        lodgingNotes: payload.plan.lodgingNotes,
        transportationNotes: payload.plan.transportationNotes,
        budgetNotes: payload.plan.budgetNotes,
        groupNotes: payload.plan.groupNotes,
      })
      setSaveMessage('Plan saved.')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save plan.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddTodo = async () => {
    if (!newTodo.trim()) {
      setTodoError('Add a checklist item first.')
      return
    }

    setIsAddingTodo(true)
    setTodoError(null)

    try {
      const response = await fetch(`/api/trips/${tripId}/plan/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: newTodo }),
      })

      const payload = (await response.json()) as TodoPayload

      if (!response.ok || !payload.todo) {
        throw new Error(payload.error || 'Unable to add checklist item.')
      }

      setData((current) =>
        current
          ? {
              ...current,
              plan: {
                ...current.plan,
                todos: [...current.plan.todos, payload.todo!],
              },
            }
          : current,
      )
      setNewTodo('')
    } catch (error) {
      setTodoError(error instanceof Error ? error.message : 'Unable to add checklist item.')
    } finally {
      setIsAddingTodo(false)
    }
  }

  const handleToggleTodo = async (todo: TripPlanTodoRecord) => {
    setBusyTodoId(todo.id)
    setTodoError(null)

    try {
      const response = await fetch(`/api/trips/${tripId}/plan/todos/${todo.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: !todo.completed }),
      })

      const payload = (await response.json()) as TodoPayload

      if (!response.ok || !payload.todo) {
        throw new Error(payload.error || 'Unable to update checklist item.')
      }

      setData((current) =>
        current
          ? {
              ...current,
              plan: {
                ...current.plan,
                todos: current.plan.todos.map((item) => (item.id === todo.id ? payload.todo! : item)),
              },
            }
          : current,
      )
    } catch (error) {
      setTodoError(error instanceof Error ? error.message : 'Unable to update checklist item.')
    } finally {
      setBusyTodoId(null)
    }
  }

  const handleDeleteTodo = async (todoId: string) => {
    setBusyTodoId(todoId)
    setTodoError(null)

    try {
      const response = await fetch(`/api/trips/${tripId}/plan/todos/${todoId}`, {
        method: 'DELETE',
      })

      const payload = (await response.json()) as { success?: boolean; error?: string }

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to delete checklist item.')
      }

      setData((current) =>
        current
          ? {
              ...current,
              plan: {
                ...current.plan,
                todos: current.plan.todos.filter((item) => item.id !== todoId),
              },
            }
          : current,
      )
    } catch (error) {
      setTodoError(error instanceof Error ? error.message : 'Unable to delete checklist item.')
    } finally {
      setBusyTodoId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border/60 bg-card p-10 text-center shadow-sm">
            <h1 className="mb-2 text-2xl font-semibold text-foreground">Loading planning board...</h1>
            <p className="text-sm text-muted-foreground">Pulling together the trip decisions.</p>
          </div>
        </div>
      </div>
    )
  }

  if (loadError || !data || !draft) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-border/60 bg-card p-10 text-center shadow-sm">
            <h1 className="mb-2 text-2xl font-semibold text-foreground">Plan not found</h1>
            <p className="text-sm text-muted-foreground">{loadError || 'This planning board does not exist.'}</p>
            <Button className="mt-6" onClick={() => void loadPlan()}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <EventTopBar
          tripId={tripId}
          tripName={data.trip.name}
          dateRange={formatDateRange(new Date(data.trip.startDate), new Date(data.trip.endDate))}
          responseCount={data.trip.responses.length}
          shareUrl={shareUrl}
          activeTab="plan"
        />

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold text-foreground">Trip plan</CardTitle>
                <CardDescription>
                  Phase 2 of Trip Sync. Lock in the plan and keep the details in one shared place.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Finalized destination</label>
                    <Input
                      value={draft.finalDestination || ''}
                      placeholder={summary?.topDestination || 'Choose the final destination'}
                      onChange={(event) => handleDraftChange('finalDestination', event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Finalized dates</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="date"
                        value={toDateInputValue(draft.finalStartDate || null)}
                        onChange={(event) => handleDraftChange('finalStartDate', fromDateInputValue(event.target.value))}
                      />
                      <Input
                        type="date"
                        value={toDateInputValue(draft.finalEndDate || null)}
                        onChange={(event) => handleDraftChange('finalEndDate', fromDateInputValue(event.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="border-border/50 bg-muted/20 shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Sparkles className="size-4 text-primary" />
                        Top voted destinations
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2 pt-0">
                      {data.suggestions.topDestinations.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No destination suggestions yet.</p>
                      ) : (
                        data.suggestions.topDestinations.map((destination) => (
                          <button
                            key={destination.label}
                            type="button"
                            className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
                            onClick={() => handleDraftChange('finalDestination', destination.label)}
                          >
                            {destination.label} · {destination.count}
                          </button>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-muted/20 shadow-none">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <Calendar className="size-4 text-primary" />
                        Best overlap windows
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-0">
                      {data.suggestions.bestDateWindows.length === 0 ? (
                        <p className="text-xs text-muted-foreground">More responses will make date suggestions stronger.</p>
                      ) : (
                        data.suggestions.bestDateWindows.map((window) => (
                          <button
                            key={`${window.startDate}-${window.endDate}`}
                            type="button"
                            className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-background px-3 py-2 text-left"
                            onClick={() => {
                              handleDraftChange('finalStartDate', window.startDate)
                              handleDraftChange('finalEndDate', window.endDate)
                            }}
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {formatShortDateRange(window.startDate, window.endDate)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Avg {window.averageAvailable.toFixed(1)} people available
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-xs font-medium">
                              {window.perfectDays} perfect day{window.perfectDays === 1 ? '' : 's'}
                            </Badge>
                          </button>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Itinerary ideas</label>
                    <Textarea
                      value={draft.itineraryIdeas || ''}
                      onChange={(event) => handleDraftChange('itineraryIdeas', event.target.value)}
                      placeholder={SECTION_PLACEHOLDERS.itineraryIdeas}
                      className="min-h-[180px] resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Lodging notes</label>
                    <Textarea
                      value={draft.lodgingNotes || ''}
                      onChange={(event) => handleDraftChange('lodgingNotes', event.target.value)}
                      placeholder={SECTION_PLACEHOLDERS.lodgingNotes}
                      className="min-h-[180px] resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Transportation notes</label>
                    <Textarea
                      value={draft.transportationNotes || ''}
                      onChange={(event) => handleDraftChange('transportationNotes', event.target.value)}
                      placeholder={SECTION_PLACEHOLDERS.transportationNotes}
                      className="min-h-[180px] resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Budget notes</label>
                    <Textarea
                      value={draft.budgetNotes || ''}
                      onChange={(event) => handleDraftChange('budgetNotes', event.target.value)}
                      placeholder={SECTION_PLACEHOLDERS.budgetNotes}
                      className="min-h-[180px] resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Group notes</label>
                  <Textarea
                    value={draft.groupNotes || ''}
                    onChange={(event) => handleDraftChange('groupNotes', event.target.value)}
                    placeholder={SECTION_PLACEHOLDERS.groupNotes}
                    className="min-h-[160px] resize-none"
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm">
                    {saveError ? (
                      <p className="text-destructive">{saveError}</p>
                    ) : saveMessage ? (
                      <p className="text-primary">{saveMessage}</p>
                    ) : (
                      <p className="text-muted-foreground">Save when the group locks in a decision or adds notes.</p>
                    )}
                  </div>
                  <Button onClick={handleSavePlan} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Spinner className="mr-2 size-4" />
                        Saving...
                      </>
                    ) : (
                      'Save plan'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-foreground">Planning snapshot</CardTitle>
                <CardDescription>Useful signals pulled from the response phase.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top destination</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{summary?.topDestination}</p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Strongest dates</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{summary?.strongestWindow}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Based on the best {data.suggestions.suggestedDurationDays}-day overlap window.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Wallet className="size-4 text-primary" />
                    Budget signal
                  </p>
                  {data.suggestions.budgetPreferences.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No budget trend yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {data.suggestions.budgetPreferences.map((budget) => (
                        <Badge key={budget.label} variant="secondary" className="text-xs font-medium">
                          {BUDGET_LABELS[budget.label] || budget.label} · {budget.count}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-border/50 bg-muted/20 p-4">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Sparkles className="size-4 text-primary" />
                    Common interests
                  </p>
                  {data.suggestions.commonInterests.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No strong interest pattern yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {data.suggestions.commonInterests.map((interest) => (
                        <Badge key={interest.label} variant="outline" className="text-xs font-medium">
                          {INTEREST_LABELS[interest.label] || interest.label} · {interest.count}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-foreground">Checklist</CardTitle>
                <CardDescription>Keep bookings and decisions moving.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={newTodo}
                    onChange={(event) => setNewTodo(event.target.value)}
                    placeholder="Add a task like book lodging"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void handleAddTodo()
                      }
                    }}
                  />
                  <Button onClick={() => void handleAddTodo()} disabled={isAddingTodo}>
                    {isAddingTodo ? <Loader2 className="size-4 animate-spin" /> : 'Add'}
                  </Button>
                </div>

                {todoError && <p className="text-sm text-destructive">{todoError}</p>}

                {data.plan.todos.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">
                      Start with a few basics: book lodging, lock dates, and figure out transportation.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.plan.todos.map((todo) => (
                      <div
                        key={todo.id}
                        className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-3"
                      >
                        <Checkbox
                          checked={todo.completed}
                          onCheckedChange={() => void handleToggleTodo(todo)}
                          disabled={busyTodoId === todo.id}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm ${todo.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {todo.text}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleDeleteTodo(todo.id)}
                          disabled={busyTodoId === todo.id}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-foreground">Plan sections</CardTitle>
                <CardDescription>The board stays lightweight but gives the group clear buckets.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {[
                  { label: 'Itinerary ideas', icon: NotebookPen },
                  { label: 'Lodging notes', icon: MapPin },
                  { label: 'Transportation notes', icon: Plane },
                  { label: 'Budget notes', icon: Wallet },
                  { label: 'Checklist', icon: CheckSquare },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/20 px-3 py-3">
                    <item.icon className="size-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
