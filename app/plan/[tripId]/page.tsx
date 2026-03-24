'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { CalendarDays, CheckSquare, Loader2, MapPinned, NotebookPen, PlaneTakeoff } from 'lucide-react'
import { EventTopBar } from '@/components/tripsync/event-top-bar'
import { TripIdeasTab, type IdeaGroupKey } from '@/components/tripsync/trip-ideas-tab'
import { TripSnapshot } from '@/components/tripsync/trip-snapshot'
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
  const [activePlannerTab, setActivePlannerTab] = useState<'ideas' | 'plan'>('plan')
  const [highlightedPlanField, setHighlightedPlanField] = useState<keyof UpdateTripPlanInput | null>(null)

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

  useEffect(() => {
    if (!highlightedPlanField) return

    const timeout = window.setTimeout(() => {
      setHighlightedPlanField(null)
    }, 2500)

    return () => window.clearTimeout(timeout)
  }, [highlightedPlanField])

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

  const savePlan = useCallback(async (nextDraft: UpdateTripPlanInput) => {
    setIsSaving(true)
    setSaveError(null)
    setSaveMessage(null)

    try {
      const response = await fetch(`/api/trips/${tripId}/plan`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nextDraft),
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
      return payload.plan
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save plan.'
      setSaveError(message)
      throw new Error(message)
    } finally {
      setIsSaving(false)
    }
  }, [tripId])

  const handleSavePlan = async () => {
    if (!draft) return
    await savePlan(draft)
  }

  const handleAddIdeaToPlan = useCallback(
    async (group: IdeaGroupKey, text: string) => {
      if (!draft) {
        throw new Error('Plan is not ready yet.')
      }

      const trimmedText = text.trim()
      if (!trimmedText) {
        return { added: false }
      }

      const field: keyof UpdateTripPlanInput =
        group === 'stays'
          ? 'lodgingNotes'
          : group === 'transport'
            ? 'transportationNotes'
            : group === 'misc'
              ? 'groupNotes'
              : 'itineraryIdeas'

      const currentValue = (draft[field] ?? '').trim()
      const existingLines = currentValue
        .split('\n')
        .map((line) => line.replace(/^[-*]\s*/, '').trim().toLowerCase())
        .filter(Boolean)

      if (existingLines.includes(trimmedText.toLowerCase())) {
        return { added: false }
      }

      const bullet = `- ${trimmedText}`
      const nextValue = currentValue ? `${currentValue}\n${bullet}` : bullet
      const nextDraft = {
        ...draft,
        [field]: nextValue,
      }

      setDraft(nextDraft)
      await savePlan(nextDraft)
      setActivePlannerTab('plan')
      setHighlightedPlanField(field)
      return { added: true }
    },
    [draft, savePlan],
  )

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

        {/* Featured Trip Snapshot */}
        <TripSnapshot trip={data.trip} plan={data.plan} />

        <div className="inline-flex w-fit items-center rounded-2xl border border-border bg-muted/40 p-1 shadow-sm">
          {(['ideas', 'plan'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActivePlannerTab(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                activePlannerTab === tab
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground'
              }`}
            >
              {tab === 'ideas' ? 'Ideas' : 'Plan'}
            </button>
          ))}
        </div>

        {activePlannerTab === 'ideas' ? (
          <TripIdeasTab onAddToPlan={handleAddIdeaToPlan} />
        ) : (
        <Card className="border-border/60 bg-card shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold text-foreground">Plan the trip</CardTitle>
            <CardDescription>
              Final details, planning notes, and must-do tasks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Hero section with quick input fields */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex flex-col gap-4 mb-6">
                <div>
                  <p className="text-base font-semibold text-foreground">Lock in the details</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Final destination, dates, and key logistics.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MapPinned className="size-4 text-primary" />
                    <label className="text-sm font-semibold text-foreground">Final destination</label>
                  </div>
                  <Input
                    value={draft.finalDestination || ''}
                    placeholder={suggestions?.topDestination || 'Choose the final destination'}
                    onChange={(event) => handleDraftChange('finalDestination', event.target.value)}
                    className="border-border/60"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-primary" />
                    <label className="text-sm font-semibold text-foreground">Final dates</label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={toDateInputValue(draft.finalStartDate || null)}
                      onChange={(event) => handleDraftChange('finalStartDate', fromDateInputValue(event.target.value))}
                      className="border-border/60"
                    />
                    <Input
                      type="date"
                      value={toDateInputValue(draft.finalEndDate || null)}
                      onChange={(event) => handleDraftChange('finalEndDate', fromDateInputValue(event.target.value))}
                      className="border-border/60"
                    />
                  </div>
                  {suggestions?.bestDates && (
                    <p className="text-xs text-muted-foreground">Suggested: {suggestions.bestDates}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Planning sections — cleaner 2-col layout */}
            <div className="grid gap-5 lg:grid-cols-2">
              <div
                className={`rounded-2xl border bg-card p-6 transition-all ${
                  highlightedPlanField === 'lodgingNotes' || highlightedPlanField === 'transportationNotes'
                    ? 'border-primary ring-2 ring-primary/20 shadow-sm'
                    : 'border-border'
                }`}
              >
                <div className="mb-5 flex items-center gap-2">
                  <PlaneTakeoff className="size-5 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">Travel & Lodging</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Where to stay and how to get there.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Lodging</label>
                    <Textarea
                      value={draft.lodgingNotes || ''}
                      onChange={(event) => handleDraftChange('lodgingNotes', event.target.value)}
                      placeholder={SECTION_PLACEHOLDERS.lodgingNotes}
                      className="min-h-[140px] resize-none border-border/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Transportation</label>
                    <Textarea
                      value={draft.transportationNotes || ''}
                      onChange={(event) => handleDraftChange('transportationNotes', event.target.value)}
                      placeholder={SECTION_PLACEHOLDERS.transportationNotes}
                      className="min-h-[140px] resize-none border-border/60"
                    />
                  </div>
                </div>
              </div>

              <div
                className={`rounded-2xl border bg-card p-6 transition-all ${
                  highlightedPlanField === 'itineraryIdeas' || highlightedPlanField === 'groupNotes'
                    ? 'border-primary ring-2 ring-primary/20 shadow-sm'
                    : 'border-border'
                }`}
              >
                <div className="mb-5 flex items-center gap-2">
                  <NotebookPen className="size-5 text-primary shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground text-sm">Itinerary & Notes</p>
                    <p className="text-xs text-muted-foreground mt-0.5">The rough plan, all in one spot.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Itinerary ideas</label>
                    <Textarea
                      value={draft.itineraryIdeas || ''}
                      onChange={(event) => handleDraftChange('itineraryIdeas', event.target.value)}
                      placeholder={SECTION_PLACEHOLDERS.itineraryIdeas}
                      className="min-h-[140px] resize-none border-border/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Group notes</label>
                    <Textarea
                      value={draft.groupNotes || ''}
                      onChange={(event) => handleDraftChange('groupNotes', event.target.value)}
                      placeholder={SECTION_PLACEHOLDERS.groupNotes}
                      className="min-h-[140px] resize-none border-border/60"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-5 flex items-center gap-2">
                <CheckSquare className="size-5 text-primary shrink-0" />
                <div>
                  <p className="font-semibold text-foreground text-sm">Checklist</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Track flights, bookings, and prep tasks.</p>
                </div>
              </div>
              <div className="flex gap-2 mb-4">
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
                  className="border-border/60"
                />
                <Button onClick={() => void handleAddTodo()} disabled={isAddingTodo} size="sm">
                  {isAddingTodo ? <Loader2 className="size-4 animate-spin" /> : 'Add'}
                </Button>
              </div>
              {todoError && <p className="mb-3 text-sm text-destructive">{todoError}</p>}
              <div className="space-y-2">
                {data.plan.todos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keep it simple: flights, lodging, key bookings, and easy-to-forget details.</p>
                ) : (
                  data.plan.todos.map((todo) => (
                    <div key={todo.id} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/40 px-3 py-3 hover:bg-muted/60 transition-colors duration-150">
                      <Checkbox
                        checked={todo.completed}
                        onCheckedChange={() => void handleToggleTodo(todo)}
                        disabled={busyTodoId === todo.id}
                      />
                      <p className={`flex-1 text-sm ${todo.completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                        {todo.text}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDeleteTodo(todo.id)}
                        disabled={busyTodoId === todo.id}
                        className="text-xs"
                      >
                        Remove
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Save footer */}
            <div className="flex flex-col gap-3 border-t border-border/50 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm">
                {saveError ? (
                  <p className="text-destructive">{saveError}</p>
                ) : saveMessage ? (
                  <p className="text-primary font-medium">{saveMessage}</p>
                ) : (
                  <p className="text-muted-foreground">Auto-saves as you type.</p>
                )}
              </div>
              <Button onClick={handleSavePlan} disabled={isSaving} size="sm">
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
        )}
      </div>
    </div>
  )
}
