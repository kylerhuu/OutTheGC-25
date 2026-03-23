import { NextResponse } from 'next/server'
import { createTripPlanTodo } from '@/lib/trip-store'
import type { CreateTripPlanTodoInput } from '@/lib/trip-types'

interface RouteContext {
  params: Promise<{ tripId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { tripId } = await context.params
    const input = (await request.json()) as CreateTripPlanTodoInput
    const todo = await createTripPlanTodo(tripId, input)

    return NextResponse.json({ todo }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to add todo.'
    const status = message === 'Trip not found.' ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
