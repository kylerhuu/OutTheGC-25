'use client'

import { useMemo, useState } from 'react'
import { Lightbulb, Plus } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

type IdeaGroupKey = 'stays' | 'places' | 'food' | 'transport' | 'misc'

interface IdeaItem {
  id: string
  text: string
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

export function TripIdeasTab() {
  const [rawIdeas, setRawIdeas] = useState('')
  const [organizedIdeas, setOrganizedIdeas] = useState<OrganizedIdeas>(EMPTY_GROUPS)
  const [addedIdeaIds, setAddedIdeaIds] = useState<string[]>([])

  const hasOrganizedIdeas = useMemo(
    () => Object.values(organizedIdeas).some((group) => group.length > 0),
    [organizedIdeas],
  )

  const handleOrganizeIdeas = () => {
    setOrganizedIdeas(parseIdeas(rawIdeas))
  }

  const handleIdeaChange = (group: IdeaGroupKey, ideaId: string, value: string) => {
    setOrganizedIdeas((current) => ({
      ...current,
      [group]: current[group].map((item) => (item.id === ideaId ? { ...item, text: value } : item)),
    }))
  }

  const handleAddToPlan = (ideaId: string) => {
    setAddedIdeaIds((current) => (current.includes(ideaId) ? current : [...current, ideaId]))
    toast({
      title: 'Added to plan',
      description: 'Saved in local state for now.',
    })
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
          <div className="mt-4 flex justify-end">
            <Button onClick={handleOrganizeIdeas}>Organize ideas</Button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Organized Ideas</p>
            <p className="text-xs text-muted-foreground">Review, edit, and save the useful ones.</p>
          </div>

          {!hasOrganizedIdeas ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-8 text-center">
              <p className="text-sm text-muted-foreground">Paste your messy notes first, then click <span className="font-medium text-foreground">Organize ideas</span>.</p>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {(Object.keys(GROUP_LABELS) as IdeaGroupKey[]).map((group) => (
                <div key={group} className="rounded-2xl border border-border/60 bg-background p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{GROUP_LABELS[group]}</p>
                    <Badge variant="outline">{organizedIdeas[group].length}</Badge>
                  </div>
                  {organizedIdeas[group].length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nothing here yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {organizedIdeas[group].map((item) => {
                        const isAdded = addedIdeaIds.includes(item.id)

                        return (
                          <div key={item.id} className="rounded-xl border border-border/60 bg-muted/20 p-3">
                            <Input
                              value={item.text}
                              onChange={(event) => handleIdeaChange(group, item.id, event.target.value)}
                              className="border-border/60 bg-background"
                            />
                            <div className="mt-3 flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                variant={isAdded ? 'outline' : 'default'}
                                onClick={() => handleAddToPlan(item.id)}
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

function parseIdeas(rawIdeas: string): OrganizedIdeas {
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
