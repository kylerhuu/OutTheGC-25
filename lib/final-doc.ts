import type { TripPlanRecord, TripWithResponses } from '@/lib/trip-types'

function splitLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
}

function formatDateRange(startDate: string, endDate: string) {
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

function section(title: string, lines: string[]) {
  const cleaned = lines.filter(Boolean)
  if (cleaned.length === 0) return `${title}\n- Still being finalized`
  return `${title}\n${cleaned.map((line) => `- ${line}`).join('\n')}`
}

export function buildFinalDocContent(trip: TripWithResponses, plan: TripPlanRecord) {
  const startDate = plan.finalStartDate ?? trip.startDate
  const endDate = plan.finalEndDate ?? trip.endDate

  const blocks = [
    trip.name,
    `${formatDateRange(startDate, endDate)} • ${trip.responses.length} ${trip.responses.length === 1 ? 'person' : 'people'} • ${getDurationLabel(startDate, endDate)}`,
    '',
    section('Overview', [
      plan.finalDestination ? `Destination: ${plan.finalDestination}` : 'Destination still being finalized',
    ]),
    '',
    section('Housing', splitLines(plan.housingNotes)),
    '',
    section('Attractions', splitLines(plan.attractionNotes)),
    '',
    section('Food Spots', splitLines(plan.foodNotes)),
    '',
    section('Fun Things To Do', splitLines(plan.activityNotes)),
    '',
    section('Possible Day Plan', splitLines(plan.dayPlanNotes)),
    '',
    section('Transportation', splitLines(plan.transportationNotes)),
    '',
    section('Things To Book', [
      ...splitLines(plan.bookingNotes),
      ...plan.todos.map((todo) => `${todo.completed ? '[x]' : '[ ]'} ${todo.text}`),
    ]),
    '',
    section('Other Notes', splitLines(plan.otherNotes)),
  ]

  return blocks.join('\n').trim()
}

export function splitFinalDocSections(content: string) {
  const lines = content.split('\n')
  const sections: Array<{ title: string; lines: string[] }> = []
  let current: { title: string; lines: string[] } | null = null

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    if (!line.trim()) continue

    if (!current) {
      current = { title: line, lines: [] }
      sections.push(current)
      continue
    }

    if (!line.startsWith('-') && !line.startsWith('[') && /^[A-Z][A-Za-z0-9 '&]+$/.test(line)) {
      current = { title: line, lines: [] }
      sections.push(current)
      continue
    }

    current.lines.push(line.replace(/^[-*]\s*/, ''))
  }

  return sections
}
