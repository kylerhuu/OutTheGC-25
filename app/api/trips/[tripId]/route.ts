import { NextResponse } from 'next/server'
import { getTripWithResponses } from '@/lib/trip-store'

interface RouteContext {
  params: Promise<{ tripId: string }>
}

export async function GET(_: Request, context: RouteContext) {
  const { tripId } = await context.params
  const trip = await getTripWithResponses(tripId)

  if (!trip) {
    return NextResponse.json({ error: 'Trip not found.' }, { status: 404 })
  }

  return NextResponse.json({ trip })
}
