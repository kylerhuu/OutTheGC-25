'use client'

import { useMemo, useState } from 'react'
import { Copy, Download, Pencil, Save } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { buildFinalDocContent, splitFinalDocSections } from '@/lib/final-doc'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { TripPlanRecord, TripWithResponses } from '@/lib/trip-types'

interface FinalDocTabProps {
  trip: TripWithResponses
  plan: TripPlanRecord
  onSave: (content: string) => Promise<void>
}

export function FinalDocTab({ trip, plan, onSave }: FinalDocTabProps) {
  const initialContent = useMemo(
    () => plan.finalDocContent?.trim() || buildFinalDocContent(trip, plan),
    [plan, trip],
  )
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)

  const sections = useMemo(() => splitFinalDocSections(draft), [draft])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draft)
      toast({
        title: 'Final doc copied',
        description: 'The finalized trip doc is now in your clipboard.',
      })
    } catch {
      toast({
        title: 'Could not copy',
        description: 'Try again in a supported browser.',
      })
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(draft)
      setIsEditing(false)
      toast({
        title: 'Final doc saved',
        description: 'Your finalized trip doc was updated.',
      })
    } catch (error) {
      toast({
        title: 'Could not save final doc',
        description: error instanceof Error ? error.message : 'Please try again.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Final Doc</p>
          <p className="text-sm text-muted-foreground">The cleaned version of the trip plan you can edit, share, or download.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void handleCopy()}>
            <Copy className="size-4" />
            Copy
          </Button>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Download className="size-4" />
            Download PDF
          </Button>
          {isEditing ? (
            <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
              <Save className="size-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          ) : (
            <Button type="button" onClick={() => setIsEditing(true)}>
              <Pencil className="size-4" />
              Edit final doc
            </Button>
          )}
        </div>
      </div>

      <article className="rounded-3xl bg-background px-6 py-8 shadow-sm print:rounded-none print:px-0 print:py-0 print:shadow-none">
        {isEditing ? (
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-[720px] resize-none border-none bg-transparent px-0 text-base leading-7 shadow-none focus-visible:ring-0"
          />
        ) : (
          <div className="space-y-8">
            {sections.length === 0 ? (
              <p className="text-base leading-7 text-muted-foreground">Nothing has been organized into the final doc yet.</p>
            ) : (
              sections.map((section, index) => (
                <section key={`${section.title}-${index}`} className={index === 0 ? 'border-b border-border/60 pb-8' : ''}>
                  {index === 0 ? (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trip Document</p>
                      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{section.title}</h1>
                      {section.lines.length > 0 && (
                        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                          {section.lines.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h2 className="mb-4 text-2xl font-semibold tracking-tight text-foreground">{section.title}</h2>
                      <ul className="space-y-2 text-base leading-7 text-foreground">
                        {section.lines.map((line) => (
                          <li key={line} className="flex gap-3">
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </section>
              ))
            )}
          </div>
        )}
      </article>
    </div>
  )
}
