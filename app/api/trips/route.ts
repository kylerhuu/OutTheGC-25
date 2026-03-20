import { NextResponse } from 'next/server'
import { createTrip } from '@/lib/trip-store'
import type { CreateTripInput } from '@/lib/trip-types'

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as CreateTripInput
    const trip = await createTrip(input)

    return NextResponse.json({ trip }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create trip.'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
