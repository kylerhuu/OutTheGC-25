import { NextResponse } from 'next/server'
import { getTripPlanPageData, updateTripPlan } from '@/lib/trip-store'
import type { UpdateTripPlanInput } from '@/lib/trip-types'

interface RouteContext {
  params: Promise<{ tripId: string }>
}

export async function GET(_: Request, context: RouteContext) {
  const { tripId } = await context.params
  const data = await getTripPlanPageData(tripId)

  if (!data) {
    return NextResponse.json({ error: 'Trip not found.' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { tripId } = await context.params
    const input = (await request.json()) as UpdateTripPlanInput
    const plan = await updateTripPlan(tripId, input)

    return NextResponse.json({ plan })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save plan.'
    const status = message === 'Trip not found.' ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
