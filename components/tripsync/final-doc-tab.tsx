'use client'

import { useMemo } from 'react'
import { Copy, Download } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import type { TripPlanRecord, TripWithResponses } from '@/lib/trip-types'

interface FinalDocTabProps {
  trip: TripWithResponses
  plan: TripPlanRecord
}

interface ItinerarySection {
  title: string
  items: string[]
}

export function FinalDocTab({ trip, plan }: FinalDocTabProps) {
  const startDate = plan.finalStartDate ?? trip.startDate
  const endDate = plan.finalEndDate ?? trip.endDate
  const itinerarySections = useMemo(() => buildItinerarySections(plan.itineraryIdeas), [plan.itineraryIdeas])
  const additionalNotes = useMemo(() => splitLines(plan.groupNotes), [plan.groupNotes])
  const lodgingLines = useMemo(() => splitLines(plan.lodgingNotes), [plan.lodgingNotes])
  const transportLines = useMemo(() => splitLines(plan.transportationNotes), [plan.transportationNotes])
  const budgetLines = useMemo(() => splitLines(plan.budgetNotes), [plan.budgetNotes])

  const plainTextDoc = useMemo(
    () =>
      buildCopyText({
        tripName: trip.name,
        dateRange: formatDocumentDateRange(startDate, endDate),
        peopleCount: trip.responses.length,
        destination: plan.finalDestination,
        duration: getDurationLabel(startDate, endDate),
        budgetLines,
        itinerarySections,
        lodgingLines,
        transportLines,
        checklist: plan.todos,
        notes: additionalNotes,
      }),
    [additionalNotes, budgetLines, endDate, itinerarySections, lodgingLines, plan, startDate, transportLines, trip],
  )

  const handleCopyPlan = async () => {
    try {
      await navigator.clipboard.writeText(plainTextDoc)
      toast({
        title: 'Plan copied',
        description: 'The final doc was copied to your clipboard.',
      })
    } catch {
      toast({
        title: 'Could not copy plan',
        description: 'Try again in a supported browser.',
      })
    }
  }

  const handleDownloadPdf = () => {
    window.print()
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Final Doc</p>
          <p className="text-sm text-muted-foreground">A clean version of the trip plan you can share, copy, or print.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => void handleCopyPlan()}>
            <Copy className="size-4" />
            Copy plan
          </Button>
          <Button type="button" onClick={handleDownloadPdf}>
            <Download className="size-4" />
            Download as PDF
          </Button>
        </div>
      </div>

      <article className="rounded-3xl bg-background px-6 py-8 shadow-sm print:rounded-none print:px-0 print:py-0 print:shadow-none">
        <header className="border-b border-border/60 pb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Trip Document</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">{trip.name}</h1>
          <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
            <p>{formatDocumentDateRange(startDate, endDate)}</p>
            <p>{trip.responses.length} {trip.responses.length === 1 ? 'person' : 'people'}</p>
          </div>
        </header>

        <section className="border-b border-border/50 py-8">
          <SectionHeading title="Overview" />
          <dl className="grid gap-6 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Destination</dt>
              <dd className="mt-2 text-base text-foreground">{plan.finalDestination || 'Still being finalized'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dates</dt>
              <dd className="mt-2 text-base text-foreground">{formatDocumentDateRange(startDate, endDate)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duration</dt>
              <dd className="mt-2 text-base text-foreground">{getDurationLabel(startDate, endDate)}</dd>
            </div>
          </dl>
          {budgetLines.length > 0 && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Budget</p>
              <ul className="mt-3 space-y-2 text-base leading-7 text-foreground">
                {budgetLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="border-b border-border/50 py-8">
          <SectionHeading title="Itinerary" />
          {itinerarySections.length === 0 ? (
            <p className="text-base leading-7 text-muted-foreground">No itinerary details yet.</p>
          ) : (
            <div className="space-y-6">
              {itinerarySections.map((section) => (
                <div key={section.title} className="print:break-inside-avoid">
                  <h3 className="text-lg font-medium text-foreground">{section.title}</h3>
                  <ul className="mt-3 space-y-2 text-base leading-7 text-foreground">
                    {section.items.map((item) => (
                      <li key={`${section.title}-${item}`} className="flex gap-3">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="border-b border-border/50 py-8">
          <SectionHeading title="Stay" />
          {lodgingLines.length === 0 ? (
            <p className="text-base leading-7 text-muted-foreground">No lodging details yet.</p>
          ) : (
            <ul className="space-y-2 text-base leading-7 text-foreground">
              {lodgingLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-b border-border/50 py-8">
          <SectionHeading title="Transport" />
          {transportLines.length === 0 ? (
            <p className="text-base leading-7 text-muted-foreground">No transport details yet.</p>
          ) : (
            <ul className="space-y-2 text-base leading-7 text-foreground">
              {transportLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-b border-border/50 py-8">
          <SectionHeading title="Checklist" />
          {plan.todos.length === 0 ? (
            <p className="text-base leading-7 text-muted-foreground">No checklist items yet.</p>
          ) : (
            <ul className="space-y-3 text-base leading-7 text-foreground">
              {plan.todos.map((todo) => (
                <li key={todo.id} className="flex gap-3">
                  <span className="text-primary">{todo.completed ? '✓' : '○'}</span>
                  <span>{todo.text}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="py-8">
          <SectionHeading title="Notes" />
          {additionalNotes.length === 0 ? (
            <p className="text-base leading-7 text-muted-foreground">No additional notes yet.</p>
          ) : (
            <ul className="space-y-2 text-base leading-7 text-foreground">
              {additionalNotes.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </section>
      </article>
    </div>
  )
}

function SectionHeading({ title }: { title: string }) {
  return <h2 className="mb-4 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
}

function splitLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
}

function buildItinerarySections(value: string): ItinerarySection[] {
  const lines = splitLines(value)
  if (lines.length === 0) return []

  const looksStructured = lines.some((line) => /^(day\s*\d+|arrival|departure|check-in|check out)/i.test(line))

  if (!looksStructured) {
    return [{ title: 'Trip Plan', items: lines }]
  }

  const sections: ItinerarySection[] = []
  let current: ItinerarySection | null = null

  lines.forEach((line) => {
    if (/^(day\s*\d+|arrival|departure|check-in|check out)/i.test(line)) {
      current = { title: line, items: [] }
      sections.push(current)
      return
    }

    if (!current) {
      current = { title: 'Trip Plan', items: [] }
      sections.push(current)
    }

    current.items.push(line)
  })

  return sections
}

function formatDocumentDateRange(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }
  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`
}

function getDurationLabel(startDate: string, endDate: string) {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
  return `${days} day${days === 1 ? '' : 's'}`
}

function buildCopyText({
  tripName,
  dateRange,
  peopleCount,
  destination,
  duration,
  budgetLines,
  itinerarySections,
  lodgingLines,
  transportLines,
  checklist,
  notes,
}: {
  tripName: string
  dateRange: string
  peopleCount: number
  destination: string
  duration: string
  budgetLines: string[]
  itinerarySections: ItinerarySection[]
  lodgingLines: string[]
  transportLines: string[]
  checklist: TripPlanRecord['todos']
  notes: string[]
}) {
  const lines: string[] = []

  lines.push(tripName)
  lines.push(dateRange)
  lines.push(`${peopleCount} ${peopleCount === 1 ? 'person' : 'people'}`)
  lines.push('')
  lines.push('Overview')
  lines.push(`Destination: ${destination || 'Still being finalized'}`)
  lines.push(`Duration: ${duration}`)

  if (budgetLines.length > 0) {
    lines.push('Budget:')
    budgetLines.forEach((line) => lines.push(`- ${line}`))
  }

  lines.push('')
  lines.push('Itinerary')
  if (itinerarySections.length === 0) {
    lines.push('- No itinerary details yet.')
  } else {
    itinerarySections.forEach((section) => {
      lines.push(section.title)
      section.items.forEach((item) => lines.push(`- ${item}`))
    })
  }

  lines.push('')
  lines.push('Stay')
  if (lodgingLines.length === 0) {
    lines.push('- No lodging details yet.')
  } else {
    lodgingLines.forEach((line) => lines.push(`- ${line}`))
  }

  lines.push('')
  lines.push('Transport')
  if (transportLines.length === 0) {
    lines.push('- No transport details yet.')
  } else {
    transportLines.forEach((line) => lines.push(`- ${line}`))
  }

  lines.push('')
  lines.push('Checklist')
  if (checklist.length === 0) {
    lines.push('- No checklist items yet.')
  } else {
    checklist.forEach((todo) => lines.push(`${todo.completed ? '✓' : '○'} ${todo.text}`))
  }

  lines.push('')
  lines.push('Notes')
  if (notes.length === 0) {
    lines.push('- No additional notes yet.')
  } else {
    notes.forEach((line) => lines.push(`- ${line}`))
  }

  return lines.join('\n')
}
