import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { prisma } from '@/lib/prisma'
import type { CreateResponseInput, CreateTripInput, ResponseRecord, TripRecord, TripWithResponses } from '@/lib/trip-types'

interface LegacyStoreShape {
  trips: TripRecord[]
  responses: ResponseRecord[]
}

const LEGACY_DATA_FILE = path.join(process.cwd(), 'data', 'trips.json')

let ensureReadyPromise: Promise<void> | null = null

function generateId(length = 10) {
  return Math.random().toString(36).slice(2, 2 + length)
}

function generateEditCode() {
  return generateId(8)
}

function serializeList(items: string[] | undefined) {
  return JSON.stringify(items || [])
}

function deserializeList(value: unknown) {
  if (typeof value !== 'string') {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
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
  destinations: unknown
  budget: string
  interests: unknown
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
    destinations: deserializeList(response.destinations),
    budget: response.budget,
    interests: deserializeList(response.interests),
    notes: response.notes,
    submittedAt: response.submittedAt.toISOString(),
    updatedAt: response.updatedAt.toISOString(),
  }
}

async function readLegacyStore(): Promise<LegacyStoreShape | null> {
  try {
    await access(LEGACY_DATA_FILE)
  } catch {
    return null
  }

  const raw = await readFile(LEGACY_DATA_FILE, 'utf8')
  return JSON.parse(raw) as LegacyStoreShape
}

async function importLegacyDataIfNeeded() {
  const existingTrips = await prisma.trip.count()
  if (existingTrips > 0) {
    return
  }

  const legacyStore = await readLegacyStore()
  if (!legacyStore || legacyStore.trips.length === 0) {
    return
  }

  await prisma.$transaction(async (tx) => {
    for (const trip of legacyStore.trips) {
      await tx.trip.create({
        data: {
          id: trip.id,
          name: trip.name,
          description: trip.description,
          startDate: trip.startDate,
          endDate: trip.endDate,
          createdAt: new Date(trip.createdAt),
        },
      })
    }

    for (const response of legacyStore.responses) {
      await tx.tripResponse.create({
        data: {
          id: response.id,
          tripId: response.tripId,
          name: response.name,
          editCode: response.editCode,
          availabilityStart: response.availabilityStart,
          availabilityEnd: response.availabilityEnd,
          destinations: serializeList(response.destinations),
          budget: response.budget,
          interests: serializeList(response.interests),
          notes: response.notes,
          submittedAt: new Date(response.submittedAt),
          updatedAt: new Date(response.updatedAt),
        },
      })
    }
  })
}

async function ensureTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Trip (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS TripResponse (
      id TEXT PRIMARY KEY,
      tripId TEXT NOT NULL,
      name TEXT NOT NULL,
      editCode TEXT NOT NULL,
      availabilityStart TEXT,
      availabilityEnd TEXT,
      destinations TEXT NOT NULL,
      budget TEXT NOT NULL,
      interests TEXT NOT NULL,
      notes TEXT NOT NULL,
      submittedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tripId) REFERENCES Trip(id) ON DELETE CASCADE
    )
  `)

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS TripResponse_tripId_idx
    ON TripResponse(tripId)
  `)
}

async function ensureDbReady() {
  if (!ensureReadyPromise) {
    ensureReadyPromise = (async () => {
      await ensureTables()
      await importLegacyDataIfNeeded()
    })()
  }

  await ensureReadyPromise
}

export async function createTrip(input: CreateTripInput): Promise<TripRecord> {
  await ensureDbReady()
  const name = input.name.trim()

  if (!name) {
    throw new Error('Trip name is required.')
  }

  if (!input.startDate || !input.endDate) {
    throw new Error('Trip date range is required.')
  }

  if (new Date(input.startDate) > new Date(input.endDate)) {
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
  await ensureDbReady()
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
  await ensureDbReady()
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true },
  })

  if (!trip) {
    throw new Error('Trip not found.')
  }

  const name = input.name.trim()
  if (!name) {
    throw new Error('Name is required.')
  }

  const response = await prisma.tripResponse.create({
    data: {
      id: generateId(10),
      tripId,
      name,
      editCode: input.editCode?.trim() || generateEditCode(),
      availabilityStart: input.availabilityStart || null,
      availabilityEnd: input.availabilityEnd || null,
      destinations: serializeList(input.destinations),
      budget: input.budget || '',
      interests: serializeList(input.interests),
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
  await ensureDbReady()
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

  const response = await prisma.tripResponse.update({
    where: {
      id: responseId,
    },
    data: {
      availabilityStart: input.availabilityStart || null,
      availabilityEnd: input.availabilityEnd || null,
      destinations: serializeList(input.destinations),
      budget: input.budget || '',
      interests: serializeList(input.interests),
      notes: input.notes?.trim() || '',
    },
  })

  return mapResponseRecord(response)
}
