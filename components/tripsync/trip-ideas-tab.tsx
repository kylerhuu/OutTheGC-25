'use client'

import { useMemo, useState } from 'react'
import { CheckSquare, Lightbulb, Loader2, Plus } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export type IdeaGroupKey = 'stays' | 'places' | 'food' | 'transport' | 'misc'

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

type OrganizedIdeas = Record<IdeaGroupKey, IdeaItem[]>

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

interface TripIdeasTabProps {
  onAddToPlan: (group: IdeaGroupKey, text: string, ideaId: string) => Promise<{ added: boolean }>
  onAddManyToPlan: (items: Array<{ group: IdeaGroupKey; text: string; ideaId: string }>) => Promise<{
    addedCount: number
    duplicateCount: number
  }>
}

export function TripIdeasTab({ onAddToPlan, onAddManyToPlan }: TripIdeasTabProps) {
  const [rawIdeas, setRawIdeas] = useState('')
  const [organizedIdeas, setOrganizedIdeas] = useState<OrganizedIdeas>(EMPTY_GROUPS)
  const [preservedSections, setPreservedSections] = useState<PreservedSection[]>([])
  const [suggestedItinerary, setSuggestedItinerary] = useState<SuggestedItinerarySection[]>([])
  const [notesSummary, setNotesSummary] = useState('')
  const [addedIdeaIds, setAddedIdeaIds] = useState<string[]>([])
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<string[]>([])
  const [isOrganizing, setIsOrganizing] = useState(false)

  const hasOrganizedIdeas = useMemo(
    () => Object.values(organizedIdeas).some((group) => group.length > 0),
    [organizedIdeas],
  )

  const handleOrganizeIdeas = async (mode: 'organize' | 'build_itinerary') => {
    if (!rawIdeas.trim()) {
      toast({
        title: 'Paste some ideas first',
        description: 'Add notes, links, or places before organizing.',
      })
      return
    }

    setIsOrganizing(true)

    try {
      const response = await fetch('/api/trips/organize-ideas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: rawIdeas, mode }),
      })

      const payload = (await response.json()) as {
        organizedIdeas?: Record<IdeaGroupKey, string[]>
        preservedSections?: PreservedSection[]
        suggestedItinerary?: SuggestedItinerarySection[]
        notesSummary?: string
        error?: string
      }

      if (!response.ok || !payload.organizedIdeas) {
        throw new Error(payload.error || 'Could not organize these ideas.')
      }

      const nextOrganizedIdeas = convertOrganizedIdeas(payload.organizedIdeas)
      const nextPreservedSections = payload.preservedSections ?? []
      const nextSuggestedItinerary =
        (payload.suggestedItinerary ?? []).length > 0
          ? payload.suggestedItinerary ?? []
          : mode === 'build_itinerary'
            ? buildFallbackItinerary(rawIdeas, payload.preservedSections ?? [])
            : []
      const nextNotesSummary = payload.notesSummary ?? ''
      const hasAnyOutput =
        Object.values(nextOrganizedIdeas).some((group) => group.length > 0) ||
        nextPreservedSections.length > 0 ||
        nextSuggestedItinerary.length > 0 ||
        nextNotesSummary.trim().length > 0

      if (!hasAnyOutput) {
        throw new Error('The AI did not return any usable trip ideas.')
      }

      setOrganizedIdeas(nextOrganizedIdeas)
      setPreservedSections(nextPreservedSections)
      setSuggestedItinerary(nextSuggestedItinerary)
      setNotesSummary(nextNotesSummary)
      setAddedIdeaIds([])
      setSelectedIdeaIds([])

      toast({
        title: mode === 'build_itinerary' ? 'Itinerary ready' : 'Ideas organized',
        description:
          mode === 'build_itinerary'
            ? 'Review the suggested day-by-day draft below.'
            : 'Your ideas were grouped and cleaned up below.',
      })
    } catch (error) {
      if (mode === 'organize') {
        const fallbackIdeas = fallbackOrganizeIdeas(rawIdeas)
        const hasFallback = Object.values(fallbackIdeas).some((group) => group.length > 0)

        if (hasFallback) {
          setOrganizedIdeas(fallbackIdeas)
          setPreservedSections([])
          setSuggestedItinerary([])
          setNotesSummary('Fallback organization was used because the AI response was empty.')
          setAddedIdeaIds([])
          setSelectedIdeaIds([])
          toast({
            title: 'Used a simple fallback',
            description: 'The AI response was empty, so a basic organizer was used instead.',
          })
          return
        }
      }

      if (mode === 'build_itinerary') {
        const fallbackItinerary = buildFallbackItinerary(rawIdeas, [])
        if (fallbackItinerary.length > 0) {
          setOrganizedIdeas(EMPTY_GROUPS)
          setPreservedSections([])
          setSuggestedItinerary(fallbackItinerary)
          setNotesSummary('A simple fallback itinerary was created because the AI response was empty.')
          setAddedIdeaIds([])
          setSelectedIdeaIds([])
          toast({
            title: 'Used a simple itinerary fallback',
            description: 'The AI response was empty, so a basic day-by-day outline was created.',
          })
          return
        }
      }

      toast({
        title: 'Could not organize ideas',
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setIsOrganizing(false)
    }
  }

  const handleIdeaChange = (group: IdeaGroupKey, ideaId: string, value: string) => {
    setOrganizedIdeas((current) => ({
      ...current,
      [group]: current[group].map((item) => (item.id === ideaId ? { ...item, text: value } : item)),
    }))
  }

  const handleAddToPlan = async (group: IdeaGroupKey, ideaId: string, text: string) => {
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

  const toggleIdeaSelection = (ideaId: string) => {
    setSelectedIdeaIds((current) =>
      current.includes(ideaId) ? current.filter((id) => id !== ideaId) : [...current, ideaId],
    )
  }

  const handleAddMany = async (items: Array<{ group: IdeaGroupKey; ideaId: string; text: string }>) => {
    if (items.length === 0) return

    try {
      const result = await onAddManyToPlan(items)
      const newlyAddedIds = items
        .filter((item) => !addedIdeaIds.includes(item.ideaId))
        .map((item) => item.ideaId)

      if (result.addedCount > 0) {
        setAddedIdeaIds((current) => Array.from(new Set([...current, ...newlyAddedIds])))
      }

      setSelectedIdeaIds((current) => current.filter((id) => !items.some((item) => item.ideaId === id)))

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
          <CardTitle className="text-xl font-semibold text-foreground">Dump your trip ideas</CardTitle>
        </div>
        <CardDescription>Paste links, places, or notes. We&apos;ll organize it for you.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/8 via-background to-fuchsia-500/5 p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge variant="secondary">Stays</Badge>
            <Badge variant="secondary">Places</Badge>
            <Badge variant="secondary">Food</Badge>
            <Badge variant="secondary">Transport</Badge>
            <Badge variant="secondary">Notes</Badge>
          </div>
          <Textarea
            value={rawIdeas}
            onChange={(event) => setRawIdeas(event.target.value)}
            placeholder={`Paste anything here...\n- hotel links\n- places to visit\n- TikTok ideas\n- random notes`}
            className="min-h-[240px] resize-none border-border/60 bg-background/90"
          />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => void handleOrganizeIdeas('organize')} disabled={isOrganizing}>
              {isOrganizing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Organizing...
                </>
              ) : (
                'Organize ideas'
              )}
            </Button>
            <Button onClick={() => void handleOrganizeIdeas('build_itinerary')} disabled={isOrganizing}>
              {isOrganizing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Building...
                </>
              ) : (
                'Build itinerary'
              )}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Organized Ideas</p>
            <p className="text-xs text-muted-foreground">Review, edit, and save the useful ones.</p>
          </div>

          {(notesSummary || preservedSections.length > 0) && (
            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                <p className="text-sm font-semibold text-foreground">What the AI picked up</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {notesSummary || 'No summary yet.'}
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-background p-4">
                <p className="text-sm font-semibold text-foreground">Preserved outline</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  If your notes already had day structure or section headings, they show up here.
                </p>
                {preservedSections.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No structured outline was detected.</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {preservedSections.map((section) => (
                      <div key={section.title} className="rounded-xl border border-border/60 bg-muted/20 p-3">
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
                )}
              </div>
            </div>
          )}

          {suggestedItinerary.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-background p-4">
              <p className="text-sm font-semibold text-foreground">Suggested itinerary</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A day-by-day draft based on the notes you pasted.
              </p>
              <div className="mt-4 space-y-4">
                {suggestedItinerary.map((section) => (
                  <div key={section.title} className="rounded-xl border border-border/60 bg-muted/20 p-3">
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

          {hasOrganizedIdeas && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 p-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  void handleAddMany(
                    (Object.keys(GROUP_LABELS) as IdeaGroupKey[]).flatMap((group) =>
                      organizedIdeas[group]
                        .filter((item) => !addedIdeaIds.includes(item.id))
                        .map((item) => ({ group, ideaId: item.id, text: item.text })),
                    ),
                  )
                }
              >
                <Plus className="size-3.5" />
                Add all to plan
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={selectedIdeaIds.length === 0}
                onClick={() =>
                  void handleAddMany(
                    (Object.keys(GROUP_LABELS) as IdeaGroupKey[]).flatMap((group) =>
                      organizedIdeas[group]
                        .filter((item) => selectedIdeaIds.includes(item.id))
                        .map((item) => ({ group, ideaId: item.id, text: item.text })),
                    ),
                  )
                }
              >
                <CheckSquare className="size-3.5" />
                Add selected ({selectedIdeaIds.length})
              </Button>
            </div>
          )}

          {!hasOrganizedIdeas ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-8 text-center">
              <p className="text-sm text-muted-foreground">Paste your messy notes first, then click <span className="font-medium text-foreground">Organize ideas</span>.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {(Object.keys(GROUP_LABELS) as IdeaGroupKey[]).map((group) => (
                <div key={group} className="rounded-2xl border border-border/60 bg-background p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{GROUP_LABELS[group]}</p>
                      <Badge variant="outline">{organizedIdeas[group].length}</Badge>
                    </div>
                    {organizedIdeas[group].length > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          void handleAddMany(
                            organizedIdeas[group]
                              .filter((item) => !addedIdeaIds.includes(item.id))
                              .map((item) => ({ group, ideaId: item.id, text: item.text })),
                          )
                        }
                      >
                        Add group
                      </Button>
                    )}
                  </div>
                  {organizedIdeas[group].length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing here yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {organizedIdeas[group].map((item) => {
                        const isAdded = addedIdeaIds.includes(item.id)

                        return (
                          <div key={item.id} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={selectedIdeaIds.includes(item.id) || isAdded}
                                onCheckedChange={() => toggleIdeaSelection(item.id)}
                                disabled={isAdded}
                                className="mt-2"
                              />
                              <Input
                                value={item.text}
                                onChange={(event) => handleIdeaChange(group, item.id, event.target.value)}
                                className="border-border/60 bg-background"
                              />
                            </div>
                            <div className="mt-3 flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant={isAdded ? 'outline' : 'default'}
                                onClick={() => void handleAddToPlan(group, item.id, item.text)}
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
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function convertOrganizedIdeas(groups: Record<IdeaGroupKey, string[]>): OrganizedIdeas {
  return (Object.keys(GROUP_LABELS) as IdeaGroupKey[]).reduce<OrganizedIdeas>((acc, group) => {
    acc[group] = groups[group].map((text, index) => ({
      id: `${group}-${index}-${text.toLowerCase().slice(0, 12)}`,
      text,
    }))
    return acc
  }, {
    stays: [],
    places: [],
    food: [],
    transport: [],
    misc: [],
  })
}

function fallbackOrganizeIdeas(rawIdeas: string): OrganizedIdeas {
  const lines = rawIdeas
    .split('\n')
    .flatMap((line) => line.split('•'))
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)

  return lines.reduce<OrganizedIdeas>((groups, line, index) => {
    const normalized = line.toLowerCase()
    const category = categorizeIdea(normalized)

    groups[category].push({
      id: `${category}-${index}-${normalized.slice(0, 12)}`,
      text: line,
    })

    return groups
  }, {
    stays: [],
    places: [],
    food: [],
    transport: [],
    misc: [],
  })
}

function categorizeIdea(line: string): IdeaGroupKey {
  if (/(hotel|airbnb|hostel|stay|resort|villa|suite|bnb|accommodation)/i.test(line)) {
    return 'stays'
  }

  if (/(restaurant|food|cafe|coffee|brunch|dinner|lunch|bar|bakery)/i.test(line)) {
    return 'food'
  }

  if (/(train|flight|bus|uber|lyft|taxi|ferry|drive|airport|car rental|rental car|metro)/i.test(line)) {
    return 'transport'
  }

  if (/(museum|beach|park|viewpoint|market|temple|spot|place|visit|activity|hike|shopping|club|tiktok)/i.test(line)) {
    return 'places'
  }

  return 'misc'
}

function buildFallbackItinerary(rawIdeas: string, preservedSections: PreservedSection[]) {
  if (preservedSections.length > 0) {
    return preservedSections
  }

  const lines = rawIdeas
    .split('\n')
    .flatMap((line) => line.split('•'))
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return []
  }

  const daySections: SuggestedItinerarySection[] = []
  const chunkSize = Math.max(2, Math.ceil(lines.length / 3))

  for (let index = 0; index < lines.length; index += chunkSize) {
    daySections.push({
      title: `Day ${daySections.length + 1}`,
      items: lines.slice(index, index + chunkSize),
    })
  }

  return daySections
}
