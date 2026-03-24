import { NextResponse } from 'next/server'
import { z } from 'zod'

const requestSchema = z.object({
  text: z.string().trim().min(1).max(20000),
  mode: z.enum(['organize', 'build_itinerary']).default('organize'),
})

const organizedIdeasSchema = z.object({
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
  suggestedItinerary: z.array(
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
        input: [
          {
            role: 'system',
            content:
              body.mode === 'build_itinerary'
                ? 'You turn trip notes into a useful planning output. Return only structured JSON. Preserve any existing day-based or section-based structure in preservedSections. Also create suggestedItinerary as a realistic day-by-day trip draft when the user input is broad or unordered. If the user already has a strong itinerary, keep that intent and lightly refine it instead of replacing it. Keep wording close to the user input, but clean obvious clutter. Put each item in exactly one category: stays, places, food, transport, or misc. notesSummary should be 1-2 short sentences that summarize the trip ideas without inventing details.'
                : 'You organize messy trip-planning notes into categories while preserving useful structure. Return only structured JSON. Keep wording close to the user input, but clean obvious clutter. If the user already organized notes by day, section, or ordered outline, preserve that structure in preservedSections instead of flattening it. Split combined notes into separate concise items when helpful. Put each item in exactly one category: stays, places, food, transport, or misc. For organize mode, suggestedItinerary should be an empty array unless the user already provided a clear itinerary. notesSummary should be 1-2 short sentences that summarize the trip ideas without inventing details.',
          },
          {
            role: 'user',
            content: body.text,
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'trip_idea_groups',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
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
                suggestedItinerary: {
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
              required: ['organizedIdeas', 'preservedSections', 'suggestedItinerary', 'notesSummary'],
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

    const outputText = extractOutputText(payload)
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
