import { NextResponse } from 'next/server'
import { recoverResponse } from '@/lib/trip-store'
import type { RecoverResponseInput } from '@/lib/trip-types'

interface RouteContext {
  params: Promise<{ tripId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { tripId } = await context.params
    const input = (await request.json()) as RecoverResponseInput
    const response = await recoverResponse(tripId, input)

    return NextResponse.json({ response })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to recover response.'
    const status = message === 'No matching response found.' ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
