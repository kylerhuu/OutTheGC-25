import { prisma } from '@/lib/prisma'
import type { CreateResponseInput, CreateTripInput, RecoverResponseInput, ResponseRecord, TripRecord, TripWithResponses } from '@/lib/trip-types'

function generateId(length = 10) {
  return Math.random().toString(36).slice(2, 2 + length)
}

function normalizeDestinationName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
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

function mergeDestinationOptions(defaults: string[], shared: string[]) {
  const seen = new Set<string>()
  const merged: string[] = []

  for (const item of [...defaults, ...shared]) {
    const normalized = normalizeDestinationName(item)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    merged.push(item.trim().replace(/\s+/g, ' '))
  }

  return merged
}

function mapTripRecord(trip: {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  createdAt: Date
  destinationOptions?: Array<{ name: string }>
}): TripRecord {
  return {
    id: trip.id,
    name: trip.name,
    description: trip.description,
    startDate: trip.startDate,
    endDate: trip.endDate,
    createdAt: trip.createdAt.toISOString(),
    destinationOptions: trip.destinationOptions?.map((option) => option.name) ?? [],
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
    include: {
      destinationOptions: true,
    },
  })

  return mapTripRecord(trip)
}

export async function getTripWithResponses(tripId: string): Promise<TripWithResponses | null> {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      destinationOptions: {
        orderBy: {
          createdAt: 'asc',
        },
      },
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

async function syncTripDestinationOptions(tripId: string, destinations: string[]) {
  const normalizedDestinations = destinations
    .map((destination) => ({
      name: destination.trim().replace(/\s+/g, ' '),
      normalizedName: normalizeDestinationName(destination),
    }))
    .filter((destination) => destination.normalizedName)

  if (normalizedDestinations.length === 0) {
    return
  }

  await prisma.$transaction(
    normalizedDestinations.map((destination) =>
      prisma.tripDestination.upsert({
        where: {
          tripId_normalizedName: {
            tripId,
            normalizedName: destination.normalizedName,
          },
        },
        update: {},
        create: {
          id: generateId(10),
          tripId,
          name: destination.name,
          normalizedName: destination.normalizedName,
        },
      }),
    ),
  )
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

  await syncTripDestinationOptions(tripId, destinations)

  const normalizedEditCode = input.editCode?.trim() || ''

  const response = await prisma.tripResponse.create({
    data: {
      id: generateId(10),
      tripId,
      name,
      editCode: normalizedEditCode,
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

  const providedCode = input.editCode?.trim() || ''

  if (providedCode !== existing.editCode) {
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

  await syncTripDestinationOptions(tripId, destinations)

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

export async function recoverResponse(tripId: string, input: RecoverResponseInput): Promise<ResponseRecord> {
  const name = input.name.trim()
  const editCode = input.editCode.trim()

  if (!name) {
    throw new Error('Name is required.')
  }

  const matchingName = await prisma.tripResponse.findFirst({
    where: {
      tripId,
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
  })

  if (!matchingName) {
    throw new Error('No matching response found.')
  }

  if (matchingName.editCode !== editCode) {
    throw new Error(matchingName.editCode ? 'Wrong edit code.' : 'This response was saved without an edit code. Leave the edit code blank to recover it.')
  }

  return mapResponseRecord(matchingName)
}

const DEFAULT_DESTINATION_OPTIONS = [
  'Barcelona',
  'Lisbon',
  'Tokyo',
  'Bali',
  'Iceland',
  'Costa Rica',
  'Portugal',
  'Greece',
]

export function getDestinationOptions(trip: TripRecord) {
  return mergeDestinationOptions(DEFAULT_DESTINATION_OPTIONS, trip.destinationOptions)
}
