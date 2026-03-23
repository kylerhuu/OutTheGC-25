import { NextResponse } from 'next/server'
import { deleteTripPlanTodo, updateTripPlanTodo } from '@/lib/trip-store'
import type { UpdateTripPlanTodoInput } from '@/lib/trip-types'

interface RouteContext {
  params: Promise<{ tripId: string; todoId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { tripId, todoId } = await context.params
    const input = (await request.json()) as UpdateTripPlanTodoInput
    const todo = await updateTripPlanTodo(tripId, todoId, input)

    return NextResponse.json({ todo })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update todo.'
    const status = message === 'Trip not found.' || message === 'Todo not found.' ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { tripId, todoId } = await context.params
    await deleteTripPlanTodo(tripId, todoId)

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to delete todo.'
    const status = message === 'Trip not found.' || message === 'Todo not found.' ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
