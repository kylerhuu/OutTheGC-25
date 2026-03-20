import { NextResponse } from 'next/server'
import { updateResponse } from '@/lib/trip-store'
import type { CreateResponseInput } from '@/lib/trip-types'

interface RouteContext {
  params: Promise<{ tripId: string; responseId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { tripId, responseId } = await context.params
    const input = (await request.json()) as CreateResponseInput
    const response = await updateResponse(tripId, responseId, input)

    return NextResponse.json({ response })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update response.'
    const status = message === 'Response not found.' ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
