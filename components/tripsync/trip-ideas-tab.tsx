'use client'

import { useMemo, useState } from 'react'
import { CheckSquare, Lightbulb, Loader2, Plus } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export type IdeaGroupKey = 'stays' | 'places' | 'food' | 'transport' | 'misc'

type CopilotMode = 'organize' | 'build_itinerary'
type CopilotIntent =
  | 'organize_notes'
  | 'make_itinerary'
  | 'group_by_location'
  | 'pull_stays_transport'
  | 'turn_into_final_doc'
type DetectedStructure = 'days' | 'locations' | 'mixed' | 'loose'

interface IdeaItem {
  id: string
  text: string
}

interface PreservedSection {
  title: string
  items: string[]
}

interface SuggestedItinerarySection {
  title: string
  items: string[]
}

interface TripIdeasContext {
  tripName: string
  tripDescription: string
  tripStartDate: string
  tripEndDate: string
  finalDestination: string
  finalStartDate: string | null
  finalEndDate: string | null
  durationDays: number
  responseCount: number
  lodgingNotes: string
  transportationNotes: string
  budgetNotes: string
  groupNotes: string
  itineraryIdeas: string
  checklist: string[]
}

type OrganizedIdeas = Record<IdeaGroupKey, IdeaItem[]>

interface CopilotTurn {
  id: string
  role: 'user' | 'assistant'
  text: string
  sourceText?: string
  mode?: CopilotMode
  intent?: CopilotIntent
  detectedStructure?: DetectedStructure
  organizedIdeas?: OrganizedIdeas
  preservedSections?: PreservedSection[]
  suggestedPlanSections?: SuggestedItinerarySection[]
  notesSummary?: string
}

const GROUP_LABELS: Record<IdeaGroupKey, string> = {
  stays: 'Stays',
  places: 'Places',
  food: 'Food',
  transport: 'Transport',
  misc: 'Misc',
}

const EMPTY_GROUPS: OrganizedIdeas = {
  stays: [],
  places: [],
  food: [],
  transport: [],
  misc: [],
}

const QUICK_ACTIONS: Array<{
  label: string
  mode: CopilotMode
  intent: CopilotIntent
  helper: string
}> = [
  {
    label: 'Organize notes',
    mode: 'organize',
    intent: 'organize_notes',
    helper: 'Best for messy notes, links, and loose lists.',
  },
  {
    label: 'Make itinerary',
    mode: 'build_itinerary',
    intent: 'make_itinerary',
    helper: 'Turns general ideas into a more usable trip draft.',
  },
  {
    label: 'Group by location',
    mode: 'build_itinerary',
    intent: 'group_by_location',
    helper: 'Useful when the notes are more about cities or neighborhoods than days.',
  },
  {
    label: 'Pull stays + transport',
    mode: 'organize',
    intent: 'pull_stays_transport',
    helper: 'Good for links, hotels, flights, trains, and logistics.',
  },
  {
    label: 'Turn into final doc',
    mode: 'build_itinerary',
    intent: 'turn_into_final_doc',
    helper: 'Shapes the notes into a cleaner, shareable planning outline.',
  },
]

interface TripIdeasTabProps {
  context: TripIdeasContext
  onAddToPlan: (group: IdeaGroupKey, text: string, ideaId: string) => Promise<{ added: boolean }>
  onAddManyToPlan: (items: Array<{ group: IdeaGroupKey; text: string; ideaId: string }>) => Promise<{
    addedCount: number
    duplicateCount: number
  }>
}

export function TripIdeasTab({ context, onAddToPlan, onAddManyToPlan }: TripIdeasTabProps) {
  const [composer, setComposer] = useState('')
  const [turns, setTurns] = useState<CopilotTurn[]>([])
  const [addedIdeaIds, setAddedIdeaIds] = useState<string[]>([])
  const [isSending, setIsSending] = useState(false)

  const hasConversation = turns.length > 0

  const latestAssistantTurn = useMemo(
    () => [...turns].reverse().find((turn) => turn.role === 'assistant' && turn.organizedIdeas),
    [turns],
  )

  const runCopilot = async ({
    displayText,
    sourceText,
    mode,
    intent,
  }: {
    displayText: string
    sourceText: string
    mode: CopilotMode
    intent: CopilotIntent
  }) => {
    if (!sourceText.trim()) {
      toast({
        title: 'Paste some ideas first',
        description: 'Add notes, links, or rough plans before asking Trip Copilot to help.',
      })
      return
    }

    const userTurn: CopilotTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: displayText.trim(),
      sourceText: sourceText.trim(),
      mode,
      intent,
    }

    setTurns((current) => [...current, userTurn])
    setIsSending(true)

    try {
      const response = await fetch('/api/trips/organize-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: sourceText.trim(),
          mode,
          intent,
          context,
          inputHints: buildInputHints(sourceText),
        }),
      })

      const payload = (await response.json()) as {
        message?: string
        detectedStructure?: DetectedStructure
        organizedIdeas?: Record<IdeaGroupKey, string[]>
        preservedSections?: PreservedSection[]
        suggestedPlanSections?: SuggestedItinerarySection[]
        notesSummary?: string
        error?: string
      }

      if (!response.ok || !payload.organizedIdeas) {
        throw new Error(payload.error || 'Trip Copilot could not organize these notes.')
      }

      const explicitDaySections = extractExplicitDaySections(userTurn.sourceText ?? userTurn.text)
      const nextPreservedSections = payload.preservedSections ?? []
      const normalizedSuggestedSections = normalizeSuggestedPlanSections({
        rawIdeas: userTurn.sourceText ?? userTurn.text,
        aiSections: payload.suggestedPlanSections ?? [],
        preservedSections: nextPreservedSections,
        explicitDaySections,
        durationDays: context.durationDays,
        allowAlternateStructure: intent === 'group_by_location' || intent === 'turn_into_final_doc',
      })
      const nextSuggestedPlanSections =
        normalizedSuggestedSections.length > 0
          ? normalizedSuggestedSections
          : mode === 'build_itinerary'
            ? buildFallbackPlanSections(
                userTurn.sourceText ?? userTurn.text,
                nextPreservedSections,
                context.durationDays,
                explicitDaySections,
                intent === 'group_by_location' || intent === 'turn_into_final_doc',
              )
            : []

      const assistantTurn: CopilotTurn = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text:
          payload.message ||
          buildFallbackAssistantMessage(
            mode,
            payload.detectedStructure ??
              inferDetectedStructure(userTurn.sourceText ?? userTurn.text, nextSuggestedPlanSections),
          ),
        sourceText: userTurn.sourceText ?? userTurn.text,
        mode,
        intent,
        detectedStructure:
          payload.detectedStructure ??
          inferDetectedStructure(userTurn.sourceText ?? userTurn.text, nextSuggestedPlanSections),
        organizedIdeas: convertOrganizedIdeas(
          payload.organizedIdeas,
          `${Date.now()}-${intent}`,
        ),
        preservedSections: nextPreservedSections,
        suggestedPlanSections: nextSuggestedPlanSections,
        notesSummary: payload.notesSummary ?? '',
      }

      setTurns((current) => [...current, assistantTurn])
      if (sourceText.trim() === composer.trim()) {
        setComposer('')
      }
      setAddedIdeaIds([])

      toast({
        title: 'Trip Copilot replied',
        description:
          mode === 'build_itinerary'
            ? 'Review the suggested structure below.'
            : 'Your notes were organized and cleaned up.',
      })
    } catch (error) {
      if (mode === 'organize') {
        const fallbackIdeas = fallbackOrganizeIdeas(userTurn.sourceText ?? userTurn.text, `fallback-${Date.now()}`)
        const hasFallback = Object.values(fallbackIdeas).some((group) => group.length > 0)

        if (hasFallback) {
          setTurns((current) => [
            ...current,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              text: 'I could not get a strong AI response, so I used a simpler organizer instead.',
              sourceText: userTurn.sourceText ?? userTurn.text,
              mode,
              intent,
              detectedStructure: inferDetectedStructure(userTurn.sourceText ?? userTurn.text, []),
              organizedIdeas: fallbackIdeas,
              preservedSections: extractStructuredSections(userTurn.sourceText ?? userTurn.text),
              suggestedPlanSections: [],
              notesSummary: 'These notes were grouped using a simple fallback organizer.',
            },
          ])
          if (sourceText.trim() === composer.trim()) {
            setComposer('')
          }
          return
        }
      }

      if (mode === 'build_itinerary') {
        const explicitDaySections = extractExplicitDaySections(userTurn.sourceText ?? userTurn.text)
        const fallbackPlan = buildFallbackPlanSections(
          userTurn.sourceText ?? userTurn.text,
          extractStructuredSections(userTurn.sourceText ?? userTurn.text),
          context.durationDays,
          explicitDaySections,
          intent === 'group_by_location' || intent === 'turn_into_final_doc',
        )

        if (fallbackPlan.length > 0) {
          setTurns((current) => [
            ...current,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              text: 'I could not get a strong AI response, so I built a simpler structure from your notes.',
              sourceText: userTurn.sourceText ?? userTurn.text,
              mode,
              intent,
              detectedStructure: inferDetectedStructure(userTurn.sourceText ?? userTurn.text, fallbackPlan),
              organizedIdeas: EMPTY_GROUPS,
              preservedSections: extractStructuredSections(userTurn.sourceText ?? userTurn.text),
              suggestedPlanSections: fallbackPlan,
              notesSummary: 'This is a fallback structure built directly from your notes and trip context.',
            },
          ])
          if (sourceText.trim() === composer.trim()) {
            setComposer('')
          }
          return
        }
      }

      toast({
        title: 'Trip Copilot got stuck',
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleSend = async (mode: CopilotMode, intent: CopilotIntent) => {
    await runCopilot({
      displayText: composer.trim(),
      sourceText: composer.trim(),
      mode,
      intent,
    })
  }

  const handleClarify = async (turn: CopilotTurn, nextIntent: CopilotIntent, label: string) => {
    const sourceText = turn.sourceText ?? turn.text

    await runCopilot({
      displayText: label,
      sourceText,
      mode: nextIntent === 'organize_notes' || nextIntent === 'pull_stays_transport' ? 'organize' : 'build_itinerary',
      intent: nextIntent,
    })
  }

  const handleIdeaChange = (turnId: string, group: IdeaGroupKey, ideaId: string, value: string) => {
    setTurns((current) =>
      current.map((turn) => {
        if (turn.id !== turnId || !turn.organizedIdeas) return turn

        return {
          ...turn,
          organizedIdeas: {
            ...turn.organizedIdeas,
            [group]: turn.organizedIdeas[group].map((item) => (item.id === ideaId ? { ...item, text: value } : item)),
          },
        }
      }),
    )
  }

  const handleAddSingleIdea = async (group: IdeaGroupKey, ideaId: string, text: string) => {
    try {
      const result = await onAddToPlan(group, text, ideaId)

      if (!result.added) {
        toast({
          title: 'Already in plan',
          description: 'That idea was already saved in the matching plan section.',
        })
        return
      }

      setAddedIdeaIds((current) => (current.includes(ideaId) ? current : [...current, ideaId]))
      toast({
        title: 'Added to plan',
        description: 'Saved to the matching plan section.',
      })
    } catch (error) {
      toast({
        title: 'Could not add idea',
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  const handleAddMany = async (items: Array<{ group: IdeaGroupKey; ideaId: string; text: string }>) => {
    if (items.length === 0) return

    try {
      const result = await onAddManyToPlan(items)

      if (result.addedCount > 0) {
        setAddedIdeaIds((current) => Array.from(new Set([...current, ...items.map((item) => item.ideaId)])))
      }

      toast({
        title: result.addedCount > 0 ? 'Ideas added to plan' : 'Everything was already in plan',
        description:
          result.addedCount > 0
            ? `${result.addedCount} added${result.duplicateCount > 0 ? `, ${result.duplicateCount} already existed` : ''}.`
            : `${result.duplicateCount} already existed in the matching plan sections.`,
      })
    } catch (error) {
      toast({
        title: 'Could not add ideas',
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    }
  }

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-5 text-primary" />
          <CardTitle className="text-xl font-semibold text-foreground">Trip Copilot</CardTitle>
        </div>
        <CardDescription>
          Paste messy ideas, links, or notes. I&apos;ll help turn them into a plan.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-fuchsia-500/5 p-5">
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.intent}
                type="button"
                onClick={() => void handleSend(action.mode, action.intent)}
                disabled={isSending}
                className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-70"
                title={action.helper}
              >
                {action.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Ask for cleanup, grouping, a day-by-day itinerary, or a cleaner final-doc style outline.
          </p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-muted/20">
          <div className="border-b border-border/60 px-5 py-4">
            <p className="text-sm font-semibold text-foreground">Conversation</p>
            <p className="text-xs text-muted-foreground">Trip Copilot explains what it noticed before showing a structure.</p>
          </div>

          <div className="max-h-[680px] space-y-4 overflow-y-auto p-5">
            {!hasConversation && (
              <AssistantBubble>
                <p className="text-sm font-medium text-foreground">Start with anything messy.</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Paste a rough itinerary, hotel links, food spots, transport notes, TikToks, or just a brain dump.
                  I&apos;ll tell you what structure makes the most sense.
                </p>
              </AssistantBubble>
            )}

            {turns.map((turn) =>
              turn.role === 'user' ? (
                <UserBubble key={turn.id}>{turn.text}</UserBubble>
              ) : (
                <AssistantTurnCard
                  key={turn.id}
                  turn={turn}
                  addedIdeaIds={addedIdeaIds}
                  onClarify={handleClarify}
                  onIdeaChange={handleIdeaChange}
                  onAddIdea={handleAddSingleIdea}
                  onAddMany={handleAddMany}
                />
              ),
            )}

            {isSending && (
              <AssistantBubble>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Trip Copilot is thinking...
                </div>
              </AssistantBubble>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background p-4">
          <Textarea
            value={composer}
            onChange={(event) => setComposer(event.target.value)}
            placeholder={`Paste anything here...\n- hotel links\n- places to visit\n- TikTok ideas\n- random notes\n- or a rough itinerary`}
            className="min-h-[180px] resize-none border-border/60 bg-background/90"
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Tip: if you already wrote days, say “clean this up.” If you just have a list, say “turn this into a plan.”
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => void handleSend('organize', 'organize_notes')}
                disabled={isSending}
              >
                {isSending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Ask Trip Copilot'
                )}
              </Button>
              <Button onClick={() => void handleSend('build_itinerary', 'make_itinerary')} disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Building...
                  </>
                ) : (
                  'Build a plan'
                )}
              </Button>
            </div>
          </div>
        </div>

        {latestAssistantTurn && (
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
            <p className="text-sm font-semibold text-foreground">Most recent structure</p>
            <p className="mt-1 text-xs text-muted-foreground">
              If you like the latest output, add the useful pieces into the saved trip plan above.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function AssistantTurnCard({
  turn,
  addedIdeaIds,
  onClarify,
  onIdeaChange,
  onAddIdea,
  onAddMany,
}: {
  turn: CopilotTurn
  addedIdeaIds: string[]
  onClarify: (turn: CopilotTurn, nextIntent: CopilotIntent, label: string) => void | Promise<void>
  onIdeaChange: (turnId: string, group: IdeaGroupKey, ideaId: string, value: string) => void
  onAddIdea: (group: IdeaGroupKey, ideaId: string, text: string) => void | Promise<void>
  onAddMany: (items: Array<{ group: IdeaGroupKey; ideaId: string; text: string }>) => void | Promise<void>
}) {
  const hasOrganizedIdeas = !!turn.organizedIdeas && Object.values(turn.organizedIdeas).some((group) => group.length > 0)
  const shouldClarify =
    turn.mode === 'build_itinerary' &&
    (turn.detectedStructure === 'mixed' || turn.detectedStructure === 'loose') &&
    turn.intent !== 'group_by_location' &&
    turn.intent !== 'turn_into_final_doc'

  return (
    <AssistantBubble>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Trip Copilot</Badge>
          {turn.detectedStructure && <Badge variant="outline">Detected: {formatStructureLabel(turn.detectedStructure)}</Badge>}
          {turn.intent === 'group_by_location' && <Badge variant="outline">Location-first</Badge>}
          {turn.intent === 'turn_into_final_doc' && <Badge variant="outline">Final-doc style</Badge>}
        </div>

        <p className="text-sm leading-6 text-foreground">{turn.text}</p>

        {shouldClarify && (
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-foreground">Want a different structure?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              These notes could be grouped more than one way. Pick the shape that fits this trip best.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => void onClarify(turn, 'make_itinerary', 'Use days')}>
                Use days
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void onClarify(turn, 'group_by_location', 'Group by location')}>
                Group by location
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => void onClarify(turn, 'turn_into_final_doc', 'Make this cleaner and shareable')}>
                Make it cleaner
              </Button>
            </div>
          </div>
        )}

        {turn.notesSummary && (
          <div className="rounded-2xl border border-border/60 bg-background p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Summary</p>
            <p className="mt-2 text-sm leading-6 text-foreground">{turn.notesSummary}</p>
          </div>
        )}

        {turn.suggestedPlanSections && turn.suggestedPlanSections.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-background p-4">
            <p className="text-sm font-semibold text-foreground">Suggested plan shape</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This is the structure Trip Copilot thinks fits your notes best.
            </p>
            <div className="mt-4 space-y-4">
              {turn.suggestedPlanSections.map((section) => (
                <div key={`${turn.id}-${section.title}`} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-sm font-semibold text-foreground">{section.title}</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {section.items.map((item) => (
                      <li key={`${section.title}-${item}`} className="flex gap-2">
                        <span className="mt-2 size-1 rounded-full bg-primary/70" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {turn.preservedSections && turn.preservedSections.length > 0 && (
          <div className="rounded-2xl border border-border/60 bg-background p-4">
            <p className="text-sm font-semibold text-foreground">Preserved outline</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Existing structure from your notes that was kept instead of flattened.
            </p>
            <div className="mt-4 space-y-4">
              {turn.preservedSections.map((section) => (
                <div key={`${turn.id}-${section.title}`} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <p className="text-sm font-semibold text-foreground">{section.title}</p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {section.items.map((item) => (
                      <li key={`${section.title}-${item}`} className="flex gap-2">
                        <span className="mt-2 size-1 rounded-full bg-primary/70" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasOrganizedIdeas && turn.organizedIdeas && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-background p-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  void onAddMany(
                    (Object.keys(GROUP_LABELS) as IdeaGroupKey[]).flatMap((group) =>
                      turn.organizedIdeas![group]
                        .filter((item) => !addedIdeaIds.includes(item.id))
                        .map((item) => ({ group, ideaId: item.id, text: item.text })),
                    ),
                  )
                }
              >
                <Plus className="size-3.5" />
                Add all to plan
              </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {(Object.keys(GROUP_LABELS) as IdeaGroupKey[]).map((group) => (
                <div key={`${turn.id}-${group}`} className="rounded-2xl border border-border/60 bg-background p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{GROUP_LABELS[group]}</p>
                      <Badge variant="outline">{turn.organizedIdeas![group].length}</Badge>
                    </div>
                    {turn.organizedIdeas![group].length > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void onAddMany(
                            turn.organizedIdeas![group]
                              .filter((item) => !addedIdeaIds.includes(item.id))
                              .map((item) => ({ group, ideaId: item.id, text: item.text })),
                          )
                        }
                      >
                        Add group
                      </Button>
                    )}
                  </div>

                  {turn.organizedIdeas![group].length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing here yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {turn.organizedIdeas![group].map((item) => {
                        const isAdded = addedIdeaIds.includes(item.id)

                        return (
                          <div key={item.id} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                            <Input
                              value={item.text}
                              onChange={(event) => onIdeaChange(turn.id, group, item.id, event.target.value)}
                              className="border-border/60 bg-background"
                            />
                            <div className="mt-3 flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant={isAdded ? 'outline' : 'default'}
                                onClick={() => void onAddIdea(group, item.id, item.text)}
                                disabled={isAdded}
                              >
                                <Plus className="mr-1.5 size-3.5" />
                                {isAdded ? 'Added' : 'Add to Plan'}
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AssistantBubble>
  )
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-3xl rounded-tr-lg bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-sm">
        {children}
      </div>
    </div>
  )
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-3xl rounded-tl-lg border border-border/60 bg-background px-4 py-4 shadow-sm">
        {children}
      </div>
    </div>
  )
}

function formatStructureLabel(structure: DetectedStructure) {
  if (structure === 'days') return 'Day-based'
  if (structure === 'locations') return 'Location-based'
  if (structure === 'mixed') return 'Mixed'
  return 'Loose notes'
}

function buildFallbackAssistantMessage(mode: CopilotMode, detectedStructure: DetectedStructure) {
  if (mode === 'organize') {
    return detectedStructure === 'days'
      ? 'Your notes already looked day-based, so I preserved that structure and also pulled out the main categories.'
      : detectedStructure === 'locations'
        ? 'These notes looked more location-based than date-based, so I kept that shape and organized the useful details.'
        : 'I grouped the notes into cleaner categories while keeping the main structure that was already there.'
  }

  return detectedStructure === 'days'
    ? 'Your notes already had a day-by-day rhythm, so I kept that instead of rebuilding everything from scratch.'
    : detectedStructure === 'locations'
      ? 'These notes make more sense grouped by locations than by days, so I used that structure.'
      : 'I turned the notes into a cleaner planning shape that should be easier to work with.'
}

function convertOrganizedIdeas(groups: Record<IdeaGroupKey, string[]>, prefix: string): OrganizedIdeas {
  return (Object.keys(GROUP_LABELS) as IdeaGroupKey[]).reduce<OrganizedIdeas>(
    (acc, group) => {
      acc[group] = groups[group].map((text, index) => ({
        id: `${prefix}-${group}-${index}-${text.toLowerCase().slice(0, 12)}`,
        text,
      }))
      return acc
    },
    {
      stays: [],
      places: [],
      food: [],
      transport: [],
      misc: [],
    },
  )
}

function fallbackOrganizeIdeas(rawIdeas: string, prefix: string): OrganizedIdeas {
  const lines = rawIdeas
    .split('\n')
    .flatMap((line) => line.split('•'))
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)

  return lines.reduce<OrganizedIdeas>(
    (groups, line, index) => {
      const normalized = line.toLowerCase()
      const category = categorizeIdea(normalized)

      groups[category].push({
        id: `${prefix}-${category}-${index}-${normalized.slice(0, 12)}`,
        text: line,
      })

      return groups
    },
    {
      stays: [],
      places: [],
      food: [],
      transport: [],
      misc: [],
    },
  )
}

function categorizeIdea(line: string): IdeaGroupKey {
  if (/(hotel|airbnb|hostel|stay|resort|villa|suite|bnb|accommodation)/i.test(line)) {
    return 'stays'
  }

  if (/(restaurant|food|cafe|coffee|brunch|dinner|lunch|bar|bakery)/i.test(line)) {
    return 'food'
  }

  if (/(train|flight|bus|uber|lyft|taxi|ferry|drive|airport|car rental|rental car|metro|station|shinkansen)/i.test(line)) {
    return 'transport'
  }

  if (/(museum|beach|park|viewpoint|market|temple|spot|place|visit|activity|hike|shopping|club|tiktok|neighborhood|district)/i.test(line)) {
    return 'places'
  }

  return 'misc'
}

function buildFallbackPlanSections(
  rawIdeas: string,
  preservedSections: PreservedSection[],
  durationDays: number,
  explicitDaySections: SuggestedItinerarySection[] = [],
  preferAlternateStructure = false,
) {
  if (!preferAlternateStructure && explicitDaySections.length > 0) {
    return explicitDaySections
  }

  const structuredSections = extractStructuredSections(rawIdeas)
  if (structuredSections.length > 0) {
    return structuredSections
  }

  if (preservedSections.length > 0) {
    return preservedSections
  }

  const groupedIdeas = fallbackOrganizeIdeas(rawIdeas, 'plan-fallback')
  const groupedSections = (Object.keys(GROUP_LABELS) as IdeaGroupKey[])
    .map((group) => ({
      title: GROUP_LABELS[group],
      items: groupedIdeas[group].map((item) => item.text),
    }))
    .filter((section) => section.items.length > 0)

  if (groupedSections.length > 0) {
    return groupedSections
  }

  const lines = rawIdeas
    .split('\n')
    .flatMap((line) => line.split('•'))
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return []
  }

  const sectionCount = durationDays > 0 ? Math.min(durationDays, Math.max(1, Math.ceil(lines.length / 4))) : 3
  const chunkSize = Math.max(1, Math.ceil(lines.length / sectionCount))
  const sections: SuggestedItinerarySection[] = []

  for (let index = 0; index < lines.length; index += chunkSize) {
    sections.push({
      title: `Section ${sections.length + 1}`,
      items: lines.slice(index, index + chunkSize),
    })
  }

  return sections
}

function extractExplicitDaySections(rawIdeas: string): SuggestedItinerarySection[] {
  const lines = rawIdeas
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const sections: SuggestedItinerarySection[] = []
  let currentSection: SuggestedItinerarySection | null = null

  for (const line of lines) {
    if (isDayHeading(line)) {
      currentSection = {
        title: line.replace(/\s*:\s*$/, ''),
        items: [],
      }
      sections.push(currentSection)
      continue
    }

    if (currentSection) {
      currentSection.items.push(line)
    }
  }

  return sections.filter((section) => section.items.length > 0)
}

function extractStructuredSections(rawIdeas: string): SuggestedItinerarySection[] {
  const lines = rawIdeas
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const sections: SuggestedItinerarySection[] = []
  let currentSection: SuggestedItinerarySection | null = null

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const nextLine = lines[index + 1]

    if (isDayHeading(line)) {
      continue
    }

    if (isSectionHeading(line, nextLine)) {
      currentSection = {
        title: line.replace(/\s*:\s*$/, ''),
        items: [],
      }
      sections.push(currentSection)
      continue
    }

    if (currentSection) {
      currentSection.items.push(line)
    }
  }

  return sections.filter((section) => section.items.length > 0)
}

function normalizeSuggestedPlanSections({
  rawIdeas,
  aiSections,
  preservedSections,
  explicitDaySections,
  durationDays,
  allowAlternateStructure,
}: {
  rawIdeas: string
  aiSections: SuggestedItinerarySection[]
  preservedSections: PreservedSection[]
  explicitDaySections: SuggestedItinerarySection[]
  durationDays: number
  allowAlternateStructure: boolean
}) {
  if (explicitDaySections.length > 0) {
    const aiDaySections = aiSections.filter((section) => isDayHeading(section.title))
    const hasAlternateAiStructure = aiSections.length > 0 && aiDaySections.length !== aiSections.length
    const aiOverSplit =
      aiDaySections.length > explicitDaySections.length ||
      (durationDays > 0 && aiDaySections.length > durationDays)

    if (allowAlternateStructure && hasAlternateAiStructure) {
      return aiSections
    }

    if (aiSections.length === 0 || aiOverSplit) {
      return explicitDaySections
    }

    if (aiDaySections.length === explicitDaySections.length) {
      return aiSections
    }

    return explicitDaySections
  }

  if (aiSections.length > 0) {
    const aiDaySections = aiSections.filter((section) => isDayHeading(section.title))
    if (durationDays > 0 && aiDaySections.length > durationDays) {
      return buildFallbackPlanSections(rawIdeas, preservedSections, durationDays, [], allowAlternateStructure)
    }

    return aiSections
  }

  return []
}

function isDayHeading(value: string) {
  return /^day\s+\d+/i.test(value.trim())
}

function isSectionHeading(line: string, nextLine?: string) {
  if (!line) return false
  if (/^https?:\/\//i.test(line)) return false
  if (/^[-*]/.test(line)) return false
  if (/[!?]$/.test(line)) return false

  const clean = line.replace(/:\s*$/, '').trim()
  const wordCount = clean.split(/\s+/).filter(Boolean).length
  const looksShort = clean.length <= 60 && wordCount <= 8
  const hasNextContent = Boolean(nextLine && nextLine.trim() && !/^https?:\/\//i.test(nextLine))

  return hasNextContent && (line.endsWith(':') || looksShort)
}

function inferDetectedStructure(rawIdeas: string, sections: SuggestedItinerarySection[]): DetectedStructure {
  if (extractExplicitDaySections(rawIdeas).length > 0) {
    return 'days'
  }

  if (sections.length > 0) {
    const dayCount = sections.filter((section) => isDayHeading(section.title)).length
    if (dayCount === sections.length && dayCount > 0) {
      return 'days'
    }
    if (dayCount === 0 && sections.some((section) => section.title.split(/\s+/).length <= 5)) {
      return 'locations'
    }
    if (dayCount > 0) {
      return 'mixed'
    }
  }

  if (extractStructuredSections(rawIdeas).length > 0) {
    return 'locations'
  }

  return 'loose'
}

function buildInputHints(text: string) {
  const explicitDayCount = extractExplicitDaySections(text).length
  const sectionHeadingCount = extractStructuredSections(text).length
  const urlCount = (text.match(/https?:\/\//gi) ?? []).length

  return {
    likelyStructure: inferLikelyStructureFromText(text),
    explicitDayCount,
    sectionHeadingCount,
    urlCount,
  }
}

function inferLikelyStructureFromText(text: string): DetectedStructure {
  const explicitDayCount = extractExplicitDaySections(text).length
  const structuredCount = extractStructuredSections(text).length
  const locationSignals = (text.match(/\b(station|district|neighborhood|area|city|temple|park|museum|beach|market)\b/gi) ?? [])
    .length

  if (explicitDayCount > 0 && structuredCount > 0) {
    return 'mixed'
  }

  if (explicitDayCount > 0) {
    return 'days'
  }

  if (structuredCount > 0 || locationSignals >= 4) {
    return 'locations'
  }

  return 'loose'
}
