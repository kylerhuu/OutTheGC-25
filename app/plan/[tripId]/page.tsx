'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { CalendarDays, CheckSquare, Loader2, MapPinned, NotebookPen, PlaneTakeoff } from 'lucide-react'
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

const SECTION_PLACEHOLDERS = {
  itineraryIdeas:
    'Arrival day\n- \n\nMain plans\n- \n\nAnything flexible\n- ',
  lodgingNotes:
    'Where to stay\n- \n\nPrice range\n- \n\nMust-haves\n- ',
  transportationNotes:
    'Flights / driving\n- \n\nArrival timing\n- \n\nGetting around\n- ',
  groupNotes:
    'Anything else the group should remember\n- \n\nOpen questions\n- ',
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

  const suggestions = useMemo(() => {
    if (!data) return null

    return {
      topDestination: data.suggestions.topDestinations[0]?.label || '',
      bestDates: data.suggestions.bestDateWindows[0]
        ? formatShortDateRange(
            data.suggestions.bestDateWindows[0].startDate,
            data.suggestions.bestDateWindows[0].endDate,
          )
        : '',
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

      setData((current) => (current ? { ...current, plan: payload.plan! } : current))
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
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
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
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
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
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <EventTopBar
          tripId={tripId}
          tripName={data.trip.name}
          dateRange={formatDateRange(new Date(data.trip.startDate), new Date(data.trip.endDate))}
          responseCount={data.trip.responses.length}
          shareUrl={shareUrl}
          activeTab="plan"
        />

        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-foreground">Plan the trip</CardTitle>
            <CardDescription>
              Final details, planning notes, and must-do tasks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-sky-500/5 to-background p-5 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-background/80 text-foreground shadow-sm">1. Lock it in</Badge>
                  <Badge className="bg-background/80 text-foreground shadow-sm">2. Add the plan</Badge>
                  <Badge className="bg-background/80 text-foreground shadow-sm">3. Track the tasks</Badge>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-base font-semibold text-foreground">Use this page after the group already picked the trip.</p>
                  <p className="text-sm text-muted-foreground">
                    If you still need to compare dates or see who&apos;s free, go back to <span className="font-medium text-foreground">Results</span>.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_1fr]">
                <div className="space-y-2 rounded-2xl border border-white/50 bg-background/80 p-4 backdrop-blur">
                  <div className="flex items-center gap-2">
                    <MapPinned className="size-4 text-primary" />
                    <label className="text-sm font-semibold text-foreground">Final destination</label>
                  </div>
                  <Input
                    value={draft.finalDestination || ''}
                    placeholder={suggestions?.topDestination || 'Choose the final destination'}
                    onChange={(event) => handleDraftChange('finalDestination', event.target.value)}
                  />
                </div>
                <div className="space-y-2 rounded-2xl border border-white/50 bg-background/80 p-4 backdrop-blur">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-primary" />
                    <label className="text-sm font-semibold text-foreground">Final dates</label>
                  </div>
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
                  {suggestions?.bestDates && (
                    <p className="text-xs text-muted-foreground">Suggested from responses: {suggestions.bestDates}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-amber-200/60 bg-gradient-to-br from-amber-50 to-background p-4">
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <PlaneTakeoff className="size-4 text-amber-600" />
                    <p className="text-sm font-semibold text-foreground">Travel details</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Where to stay and how to get there.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Lodging</label>
                    <Textarea
                      value={draft.lodgingNotes || ''}
                      onChange={(event) => handleDraftChange('lodgingNotes', event.target.value)}
                      placeholder={SECTION_PLACEHOLDERS.lodgingNotes}
                      className="min-h-[150px] resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Transportation</label>
                    <Textarea
                      value={draft.transportationNotes || ''}
                      onChange={(event) => handleDraftChange('transportationNotes', event.target.value)}
                      placeholder={SECTION_PLACEHOLDERS.transportationNotes}
                      className="min-h-[150px] resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-sky-200/60 bg-gradient-to-br from-sky-50 to-background p-4">
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <NotebookPen className="size-4 text-sky-600" />
                    <p className="text-sm font-semibold text-foreground">Ideas + notes</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">The rough plan, all in one spot.</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Itinerary ideas</label>
                    <Textarea
                      value={draft.itineraryIdeas || ''}
                      onChange={(event) => handleDraftChange('itineraryIdeas', event.target.value)}
                      placeholder={SECTION_PLACEHOLDERS.itineraryIdeas}
                      className="min-h-[150px] resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Notes</label>
                    <Textarea
                      value={draft.groupNotes || ''}
                      onChange={(event) => handleDraftChange('groupNotes', event.target.value)}
                      placeholder={SECTION_PLACEHOLDERS.groupNotes}
                      className="min-h-[150px] resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/8 via-background to-fuchsia-500/5 p-4">
              <div className="mb-4 flex items-center gap-2">
                <CheckSquare className="size-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Checklist</p>
              </div>
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
              {todoError && <p className="mt-3 text-sm text-destructive">{todoError}</p>}
              <div className="mt-4 space-y-2">
                {data.plan.todos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keep it simple: flights, lodging, key bookings, and anything easy to forget.</p>
                ) : (
                  data.plan.todos.map((todo) => (
                    <div key={todo.id} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background px-3 py-3">
                      <Checkbox
                        checked={todo.completed}
                        onCheckedChange={() => void handleToggleTodo(todo)}
                        disabled={busyTodoId === todo.id}
                      />
                      <p className={`min-w-0 flex-1 text-sm ${todo.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {todo.text}
                      </p>
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
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-border/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                {saveError ? (
                  <p className="text-destructive">{saveError}</p>
                ) : saveMessage ? (
                  <p className="text-primary">{saveMessage}</p>
                ) : (
                  <p className="text-muted-foreground">Keep this page for the actual plan, not decision-making.</p>
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
    </div>
  )
}
