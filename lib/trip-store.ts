import { prisma } from '@/lib/prisma'
import type { CreateResponseInput, CreateTripInput, ResponseRecord, TripRecord, TripWithResponses } from '@/lib/trip-types'

function generateId(length = 10) {
  return Math.random().toString(36).slice(2, 2 + length)
}

function generateEditCode() {
  return generateId(8)
}

function normalizeDate(value: string) {
  const normalized = new Date(value)

  if (Number.isNaN(normalized.getTime())) {
    throw new Error('Invalid date provided.')
  }

  return normalized
}

function normalizeList(items: string[] | undefined) {
  return Array.from(
    new Set(
      (items || [])
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

function mapTripRecord(trip: {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  createdAt: Date
}): TripRecord {
  return {
    ...trip,
    createdAt: trip.createdAt.toISOString(),
  }
}

function mapResponseRecord(response: {
  id: string
  tripId: string
  name: string
  editCode: string
  availabilityStart: string | null
  availabilityEnd: string | null
  destinations: string[]
  budget: string
  interests: string[]
  notes: string
  submittedAt: Date
  updatedAt: Date
}): ResponseRecord {
  return {
    id: response.id,
    tripId: response.tripId,
    name: response.name,
    editCode: response.editCode,
    availabilityStart: response.availabilityStart,
    availabilityEnd: response.availabilityEnd,
    destinations: response.destinations,
    budget: response.budget,
    interests: response.interests,
    notes: response.notes,
    submittedAt: response.submittedAt.toISOString(),
    updatedAt: response.updatedAt.toISOString(),
  }
}

export async function createTrip(input: CreateTripInput): Promise<TripRecord> {
  const name = input.name.trim()

  if (!name) {
    throw new Error('Trip name is required.')
  }

  if (!input.startDate || !input.endDate) {
    throw new Error('Trip date range is required.')
  }

  const startDate = normalizeDate(input.startDate)
  const endDate = normalizeDate(input.endDate)

  if (startDate > endDate) {
    throw new Error('Start date must be before end date.')
  }

  const trip = await prisma.trip.create({
    data: {
      id: generateId(10),
      name,
      description: input.description?.trim() || '',
      startDate: input.startDate,
      endDate: input.endDate,
    },
  })

  return mapTripRecord(trip)
}

export async function getTripWithResponses(tripId: string): Promise<TripWithResponses | null> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      responses: {
        orderBy: {
          submittedAt: 'asc',
        },
      },
    },
  })

  if (!trip) {
    return null
  }

  return {
    ...mapTripRecord(trip),
    responses: trip.responses.map(mapResponseRecord),
  }
}

export async function createResponse(tripId: string, input: CreateResponseInput): Promise<ResponseRecord> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      startDate: true,
      endDate: true,
    },
  })

  if (!trip) {
    throw new Error('Trip not found.')
  }

  const name = input.name.trim()
  if (!name) {
    throw new Error('Name is required.')
  }

  const destinations = normalizeList(input.destinations)
  const interests = normalizeList(input.interests)
  const tripStart = normalizeDate(trip.startDate)
  const tripEnd = normalizeDate(trip.endDate)

  if ((input.availabilityStart && !input.availabilityEnd) || (!input.availabilityStart && input.availabilityEnd)) {
    throw new Error('Please select a complete availability range.')
  }

  if (input.availabilityStart && input.availabilityEnd) {
    const availabilityStart = normalizeDate(input.availabilityStart)
    const availabilityEnd = normalizeDate(input.availabilityEnd)

    if (availabilityStart > availabilityEnd) {
      throw new Error('Availability start must be before availability end.')
    }

    if (availabilityStart < tripStart || availabilityEnd > tripEnd) {
      throw new Error('Availability must stay within the trip date range.')
    }
  }

  const response = await prisma.tripResponse.create({
    data: {
      id: generateId(10),
      tripId,
      name,
      editCode: input.editCode?.trim() || generateEditCode(),
      availabilityStart: input.availabilityStart || null,
      availabilityEnd: input.availabilityEnd || null,
      destinations,
      budget: input.budget || '',
      interests,
      notes: input.notes?.trim() || '',
    },
  })

  return mapResponseRecord(response)
}

export async function updateResponse(
  tripId: string,
  responseId: string,
  input: CreateResponseInput,
): Promise<ResponseRecord> {
  const existing = await prisma.tripResponse.findFirst({
    where: {
      id: responseId,
      tripId,
    },
  })

  if (!existing) {
    throw new Error('Response not found.')
  }

  const providedCode = input.editCode?.trim()

  if (!providedCode || providedCode !== existing.editCode) {
    throw new Error('Invalid edit code.')
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: {
      startDate: true,
      endDate: true,
    },
  })

  if (!trip) {
    throw new Error('Trip not found.')
  }

  const destinations = normalizeList(input.destinations)
  const interests = normalizeList(input.interests)
  const tripStart = normalizeDate(trip.startDate)
  const tripEnd = normalizeDate(trip.endDate)

  if ((input.availabilityStart && !input.availabilityEnd) || (!input.availabilityStart && input.availabilityEnd)) {
    throw new Error('Please select a complete availability range.')
  }

  if (input.availabilityStart && input.availabilityEnd) {
    const availabilityStart = normalizeDate(input.availabilityStart)
    const availabilityEnd = normalizeDate(input.availabilityEnd)

    if (availabilityStart > availabilityEnd) {
      throw new Error('Availability start must be before availability end.')
    }

    if (availabilityStart < tripStart || availabilityEnd > tripEnd) {
      throw new Error('Availability must stay within the trip date range.')
    }
  }

  const response = await prisma.tripResponse.update({
    where: {
      id: responseId,
    },
    data: {
      availabilityStart: input.availabilityStart || null,
      availabilityEnd: input.availabilityEnd || null,
      destinations,
      budget: input.budget || '',
      interests,
      notes: input.notes?.trim() || '',
    },
  })

  return mapResponseRecord(response)
}
