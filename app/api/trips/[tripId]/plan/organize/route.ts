import { NextResponse } from 'next/server'
import { buildFinalDocContent } from '@/lib/final-doc'
import { OUTTHEGC_PLUS_REQUIRED_CODE } from '@/lib/trip-billing'
import { getTripPlanPageData, updateTripPlan } from '@/lib/trip-store'
import { tripHasOutTheGcPlus } from '@/lib/trip-store'

interface RouteContext {
  params: Promise<{ tripId: string }>
}

export async function POST(_: Request, context: RouteContext) {
  try {
    const { tripId } = await context.params
    const hasPlus = await tripHasOutTheGcPlus(tripId)

    if (!hasPlus) {
      return NextResponse.json(
        {
          error: 'AI final-doc organization is part of OutTheGC+.',
          code: OUTTHEGC_PLUS_REQUIRED_CODE,
        },
        { status: 402 },
      )
    }

    const data = await getTripPlanPageData(tripId)

    if (!data) {
      return NextResponse.json({ error: 'Trip not found.' }, { status: 404 })
    }

    const fallbackContent = buildFinalDocContent(data.trip, data.plan)

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not set.' }, { status: 500 })
    }

    const prompt = [
      'Turn these trip planning notes into a clean, readable final trip document.',
      'Keep the plan grounded in the provided notes and do not invent bookings or exact facts.',
      'Use clear sections with headings like Overview, Housing, Attractions, Food Spots, Fun Things To Do, Possible Day Plan, Transportation, Things To Book, and Other Notes when relevant.',
      'Write in plain text that looks good when copied into a doc or PDF.',
      '',
      `Trip: ${data.trip.name}`,
      `Dates: ${data.plan.finalStartDate ?? data.trip.startDate} to ${data.plan.finalEndDate ?? data.trip.endDate}`,
      `Final destination: ${data.plan.finalDestination || 'Not finalized yet'}`,
      '',
      `Housing:\n${data.plan.housingNotes || '(none)'}`,
      '',
      `Attractions:\n${data.plan.attractionNotes || '(none)'}`,
      '',
      `Food Spots:\n${data.plan.foodNotes || '(none)'}`,
      '',
      `Fun Things To Do:\n${data.plan.activityNotes || '(none)'}`,
      '',
      `Possible Day Plan:\n${data.plan.dayPlanNotes || '(none)'}`,
      '',
      `Transportation:\n${data.plan.transportationNotes || '(none)'}`,
      '',
      `Things To Book:\n${data.plan.bookingNotes || '(none)'}`,
      '',
      `Other Notes:\n${data.plan.otherNotes || '(none)'}`,
    ].join('\n')

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IDEAS_MODEL || 'gpt-4o-mini',
        instructions: 'Return only the cleaned final trip document as plain text. Do not wrap it in JSON.',
        input: prompt,
      }),
    })

    const payload = await response.json()
    const outputText =
      (typeof payload?.output_text === 'string' ? payload.output_text : null) ??
      extractOutputText(payload) ??
      fallbackContent

    const plan = await updateTripPlan(tripId, {
      finalDocContent: outputText.trim() || fallbackContent,
    })

    return NextResponse.json({ plan, usedFallback: !response.ok })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to organize plan.'
    return NextResponse.json({ error: message }, { status: 400 })
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
