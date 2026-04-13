import { NextResponse } from 'next/server'
import { z } from 'zod'
import { OUTTHEGC_PLUS_REQUIRED_CODE } from '@/lib/trip-billing'
import { tripHasOutTheGcPlus } from '@/lib/trip-store'

const requestSchema = z.object({
  tripId: z.string().trim().min(1),
  text: z.string().trim().min(1).max(20000),
  mode: z.enum(['organize', 'build_itinerary']).default('organize'),
  intent: z
    .enum([
      'organize_notes',
      'make_itinerary',
      'group_by_location',
      'pull_stays_transport',
      'turn_into_final_doc',
    ])
    .optional(),
  inputHints: z
    .object({
      likelyStructure: z.enum(['days', 'locations', 'mixed', 'loose']).optional(),
      explicitDayCount: z.number().int().nonnegative().optional(),
      sectionHeadingCount: z.number().int().nonnegative().optional(),
      urlCount: z.number().int().nonnegative().optional(),
    })
    .optional(),
  context: z
    .object({
      tripName: z.string().optional(),
      tripDescription: z.string().optional(),
      tripStartDate: z.string().optional(),
      tripEndDate: z.string().optional(),
      finalDestination: z.string().optional(),
      finalStartDate: z.string().nullable().optional(),
      finalEndDate: z.string().nullable().optional(),
      durationDays: z.number().int().positive().optional(),
      responseCount: z.number().int().nonnegative().optional(),
      lodgingNotes: z.string().optional(),
      transportationNotes: z.string().optional(),
      budgetNotes: z.string().optional(),
      groupNotes: z.string().optional(),
      itineraryIdeas: z.string().optional(),
      checklist: z.array(z.string()).optional(),
    })
    .optional(),
})

const organizedIdeasSchema = z.object({
  message: z.string(),
  detectedStructure: z.enum(['days', 'locations', 'mixed', 'loose']),
  organizedIdeas: z.object({
    stays: z.array(z.string()),
    places: z.array(z.string()),
    food: z.array(z.string()),
    transport: z.array(z.string()),
    misc: z.array(z.string()),
  }),
  preservedSections: z.array(
    z.object({
      title: z.string(),
      items: z.array(z.string()),
    }),
  ),
  suggestedPlanSections: z.array(
    z.object({
      title: z.string(),
      items: z.array(z.string()),
    }),
  ),
  notesSummary: z.string(),
})

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json())
    const hasPlus = await tripHasOutTheGcPlus(body.tripId)

    if (!hasPlus) {
      return NextResponse.json(
        {
          error: 'Trip Copilot is part of OutTheGC+.',
          code: OUTTHEGC_PLUS_REQUIRED_CODE,
        },
        { status: 402 },
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not set.' },
        { status: 500 },
      )
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IDEAS_MODEL || 'gpt-4o-mini',
        instructions: buildInstructions(body.mode, body.intent, body.context, body.inputHints),
        input: buildInputPayload(body.text, body.context, body.intent, body.inputHints),
        text: {
          format: {
            type: 'json_schema',
            name: 'trip_idea_groups',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                message: { type: 'string' },
                detectedStructure: {
                  type: 'string',
                  enum: ['days', 'locations', 'mixed', 'loose'],
                },
                organizedIdeas: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    stays: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    places: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    food: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    transport: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                    misc: {
                      type: 'array',
                      items: { type: 'string' },
                    },
                  },
                  required: ['stays', 'places', 'food', 'transport', 'misc'],
                },
                preservedSections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      title: { type: 'string' },
                      items: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                    required: ['title', 'items'],
                  },
                },
                suggestedPlanSections: {
                  type: 'array',
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      title: { type: 'string' },
                      items: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                    required: ['title', 'items'],
                  },
                },
                notesSummary: { type: 'string' },
              },
              required: [
                'message',
                'detectedStructure',
                'organizedIdeas',
                'preservedSections',
                'suggestedPlanSections',
                'notesSummary',
              ],
            },
          },
        },
      }),
    })

    const payload = await response.json()

    if (!response.ok) {
      const message =
        typeof payload?.error?.message === 'string'
          ? payload.error.message
          : 'OpenAI could not organize these ideas.'
      return NextResponse.json({ error: message }, { status: response.status })
    }

    const refusal = extractRefusal(payload)
    if (refusal) {
      return NextResponse.json({ error: refusal }, { status: 400 })
    }

    const outputText =
      (typeof payload?.output_text === 'string' ? payload.output_text : null) ??
      extractOutputText(payload)
    if (!outputText) {
      return NextResponse.json(
        { error: 'OpenAI returned no structured output.' },
        { status: 500 },
      )
    }

    const organizedIdeas = organizedIdeasSchema.parse(JSON.parse(outputText))
    return NextResponse.json(organizedIdeas)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Please paste some trip ideas before organizing.' },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to organize trip ideas.',
      },
      { status: 500 },
    )
  }
}

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null

  const output = 'output' in payload ? payload.output : null
  if (!Array.isArray(output)) return null

  const texts = output.flatMap((item) => {
    if (!item || typeof item !== 'object' || !('content' in item)) return []
    const content = item.content
    if (!Array.isArray(content)) return []

    return content
      .filter(
        (entry) =>
          entry &&
          typeof entry === 'object' &&
          'type' in entry &&
          entry.type === 'output_text' &&
          'text' in entry &&
          typeof entry.text === 'string',
      )
      .map((entry) => entry.text)
  })

  return texts.join('').trim() || null
}

function extractRefusal(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null

  const output = 'output' in payload ? payload.output : null
  if (!Array.isArray(output)) return null

  for (const item of output) {
    if (!item || typeof item !== 'object' || !('content' in item)) continue
    const content = item.content
    if (!Array.isArray(content)) continue

    for (const entry of content) {
      if (
        entry &&
        typeof entry === 'object' &&
        'type' in entry &&
        entry.type === 'refusal' &&
        'refusal' in entry &&
        typeof entry.refusal === 'string'
      ) {
        return entry.refusal
      }
    }
  }

  return null
}

function buildContextInstructions(context: z.infer<typeof requestSchema>['context']) {
  if (!context) return ''

  return `\nUse the provided trip context when it helps: preserve dates, destination, lodging, transport, budget, and existing planning notes. Respect the real trip duration when deciding whether a plan should be split by days or by another structure. If the trip duration is known, treat it as a hard upper bound for day-based sections. If the user already supplied explicit day headings, preserve their day count and order. Do not throw away meaningful details from the user input just because they do not fit a simple category.`
}

function buildInstructions(
  mode: z.infer<typeof requestSchema>['mode'],
  intent: z.infer<typeof requestSchema>['intent'],
  context: z.infer<typeof requestSchema>['context'],
  inputHints: z.infer<typeof requestSchema>['inputHints'],
) {
  const base =
    mode === 'build_itinerary'
      ? 'You turn trip notes into a useful planning output. Return only structured JSON. Preserve any existing day-based or section-based structure in preservedSections. Also create suggestedPlanSections as the best final planning shape for the input and context. The output does not always need to be by day. If the content is clearly organized by locations, neighborhoods, things to see, transport steps, or another useful structure, use that instead. If the content already has a strong itinerary, keep that intent and lightly refine it instead of replacing it. If the input already contains explicit Day 1 / Day 2 / Day 3 style headings, preserve that structure and do not create more day-based sections than already exist in the user input. If the trip has a known duration, never create more day-based sections than that duration and never compress a long multi-day itinerary into just a few generic days.'
      : 'You organize messy trip-planning notes into categories while preserving useful structure. Return only structured JSON. Keep wording close to the user input, but clean obvious clutter. If the user already organized notes by day, section, or ordered outline, preserve that structure in preservedSections instead of flattening it. Split combined notes into separate concise items when helpful. For organize mode, suggestedPlanSections should usually be empty unless the user already provided a clear planning structure that should be mirrored.'

  const shared =
    ' Put each item in exactly one category: stays, places, food, transport, or misc. notesSummary should be 1-2 short sentences that summarize the trip ideas without inventing details. detectedStructure must be one of: days, locations, mixed, or loose. message should be a short, helpful assistant reply that explains what you noticed and what structure you chose.'

  const intentInstructions =
    intent === 'group_by_location'
      ? ' Prefer grouping the suggested plan by locations, neighborhoods, or destinations instead of days unless the user already clearly wrote a day-by-day plan.'
      : intent === 'pull_stays_transport'
        ? ' Focus on extracting lodging and transportation details clearly. suggestedPlanSections can stay empty unless there is an obvious planning structure.'
        : intent === 'turn_into_final_doc'
          ? ' Shape suggestedPlanSections like a clean shareable trip document. Prefer sections such as Overview, Stay, Transport, Itinerary, and Notes instead of raw categories when that fits the input.'
          : ''

  const hintInstructions = inputHints
    ? ` Use these lightweight input hints to save work instead of rediscovering them: likelyStructure=${inputHints.likelyStructure ?? 'unknown'}, explicitDayCount=${inputHints.explicitDayCount ?? 0}, sectionHeadingCount=${inputHints.sectionHeadingCount ?? 0}, urlCount=${inputHints.urlCount ?? 0}.`
    : ''

  return `${base}${shared}${intentInstructions}${hintInstructions}${buildContextInstructions(context)}`
}

function buildInputPayload(
  text: string,
  context: z.infer<typeof requestSchema>['context'],
  intent: z.infer<typeof requestSchema>['intent'],
  inputHints: z.infer<typeof requestSchema>['inputHints'],
) {
  const blocks: string[] = []

  const compactContext = buildCompactContext(context, intent)
  if (compactContext.length > 0) {
    blocks.push(`Trip context:\n${compactContext.join('\n')}`)
  }

  if (inputHints) {
    const hintLines = [
      inputHints.likelyStructure ? `Likely structure: ${inputHints.likelyStructure}` : null,
      typeof inputHints.explicitDayCount === 'number' ? `Explicit day headings: ${inputHints.explicitDayCount}` : null,
      typeof inputHints.sectionHeadingCount === 'number' ? `Section headings: ${inputHints.sectionHeadingCount}` : null,
      typeof inputHints.urlCount === 'number' ? `Links pasted: ${inputHints.urlCount}` : null,
    ].filter(Boolean)

    if (hintLines.length > 0) {
      blocks.push(`Input hints:\n${hintLines.join('\n')}`)
    }
  }

  blocks.push(`User notes:\n${text}`)
  return blocks.join('\n\n')
}

function buildCompactContext(
  context: z.infer<typeof requestSchema>['context'],
  intent: z.infer<typeof requestSchema>['intent'],
) {
  if (!context) return []

  const lines: string[] = []
  const finalDates =
    context.finalStartDate && context.finalEndDate
      ? `${context.finalStartDate.slice(0, 10)} to ${context.finalEndDate.slice(0, 10)}`
      : null
  const tripDates =
    context.tripStartDate && context.tripEndDate
      ? `${context.tripStartDate.slice(0, 10)} to ${context.tripEndDate.slice(0, 10)}`
      : null

  pushContextLine(lines, 'Trip', context.tripName)
  pushContextLine(lines, 'Final destination', context.finalDestination)
  pushContextLine(lines, 'Final dates', finalDates)
  pushContextLine(lines, 'Trip dates', tripDates)
  pushContextLine(lines, 'Duration days', context.durationDays ? String(context.durationDays) : null)

  if (intent !== 'pull_stays_transport') {
    pushContextLine(lines, 'Response count', typeof context.responseCount === 'number' ? String(context.responseCount) : null)
  }

  if (intent === 'pull_stays_transport' || intent === 'make_itinerary' || intent === 'turn_into_final_doc') {
    pushContextLine(lines, 'Existing stay notes', compactText(context.lodgingNotes, 280))
    pushContextLine(lines, 'Existing transport notes', compactText(context.transportationNotes, 280))
  }

  if (intent === 'make_itinerary' || intent === 'turn_into_final_doc') {
    pushContextLine(lines, 'Budget notes', compactText(context.budgetNotes, 180))
    pushContextLine(lines, 'Existing itinerary notes', compactText(context.itineraryIdeas, 280))
    pushContextLine(lines, 'Group notes', compactText(context.groupNotes, 180))
    pushContextLine(lines, 'Checklist', compactList(context.checklist, 4))
  }

  if (intent === 'organize_notes' || intent === 'group_by_location') {
    pushContextLine(lines, 'Trip description', compactText(context.tripDescription, 140))
    pushContextLine(lines, 'Existing itinerary notes', compactText(context.itineraryIdeas, 180))
  }

  return lines
}

function compactText(value: string | undefined, maxLength: number) {
  if (!value) return null

  const normalized = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 6)
    .join(' | ')

  if (!normalized) return null
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized
}

function compactList(values: string[] | undefined, maxItems: number) {
  if (!values || values.length === 0) return null
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, maxItems)
    .join(' | ')
}

function pushContextLine(lines: string[], label: string, value: string | null | undefined) {
  if (!value) return
  lines.push(`${label}: ${value}`)
}
