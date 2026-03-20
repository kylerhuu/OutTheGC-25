import { NextResponse } from 'next/server'
import { createResponse } from '@/lib/trip-store'
import type { CreateResponseInput } from '@/lib/trip-types'

interface RouteContext {
  params: Promise<{ tripId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { tripId } = await context.params
    const input = (await request.json()) as CreateResponseInput
    const response = await createResponse(tripId, input)

    return NextResponse.json({ response }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save response.'
    const status = message === 'Trip not found.' ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
