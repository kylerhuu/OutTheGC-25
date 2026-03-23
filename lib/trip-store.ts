import { prisma } from '@/lib/prisma'
import type {
  CreateResponseInput,
  CreateTripInput,
  CreateTripPlanTodoInput,
  RecoverResponseInput,
  ResponseRecord,
  TripPlanPageData,
  TripPlanRecord,
  TripPlanSuggestions,
  TripPlanTodoRecord,
  TripRecord,
  TripWithResponses,
  UpdateTripPlanInput,
  UpdateTripPlanTodoInput,
} from '@/lib/trip-types'

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

function mapTripWithResponses(trip: {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  createdAt: Date
  destinationOptions?: Array<{ name: string }>
  responses: Array<{
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
  }>
}): TripWithResponses {
  return {
    ...mapTripRecord(trip),
    responses: trip.responses.map(mapResponseRecord),
  }
}

function mapTripPlanTodoRecord(todo: {
  id: string
  tripPlanId: string
  text: string
  completed: boolean
  createdAt: Date
  updatedAt: Date
}): TripPlanTodoRecord {
  return {
    id: todo.id,
    tripPlanId: todo.tripPlanId,
    text: todo.text,
    completed: todo.completed,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  }
}

function mapTripPlanRecord(plan: {
  id: string
  tripId: string
  finalDestination: string
  finalStartDate: string | null
  finalEndDate: string | null
  itineraryIdeas: string
  lodgingNotes: string
  transportationNotes: string
  budgetNotes: string
  groupNotes: string
  createdAt: Date
  updatedAt: Date
  todos?: Array<{
    id: string
    tripPlanId: string
    text: string
    completed: boolean
    createdAt: Date
    updatedAt: Date
  }>
}): TripPlanRecord {
  return {
    id: plan.id,
    tripId: plan.tripId,
    finalDestination: plan.finalDestination,
    finalStartDate: plan.finalStartDate,
    finalEndDate: plan.finalEndDate,
    itineraryIdeas: plan.itineraryIdeas,
    lodgingNotes: plan.lodgingNotes,
    transportationNotes: plan.transportationNotes,
    budgetNotes: plan.budgetNotes,
    groupNotes: plan.groupNotes,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    todos: plan.todos?.map(mapTripPlanTodoRecord) ?? [],
  }
}

function countLabels(items: string[]) {
  const counts = new Map<string, number>()

  for (const item of items) {
    const label = item.trim()
    if (!label) continue
    counts.set(label, (counts.get(label) || 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return a.label.localeCompare(b.label)
    })
}

function getDateWindowSuggestions(trip: TripWithResponses): TripPlanSuggestions['bestDateWindows'] {
  const tripStart = normalizeDate(trip.startDate)
  const tripEnd = normalizeDate(trip.endDate)
  const totalParticipants = trip.responses.length

  if (totalParticipants === 0) {
    return []
  }

  const daysInRange = Math.max(
    1,
    Math.floor((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1,
  )
  const duration = Math.min(4, daysInRange)
  const dayCounts: Array<{ date: Date; count: number }> = []
  const cursor = new Date(tripStart)

  while (cursor <= tripEnd) {
    const date = new Date(cursor)
    date.setHours(0, 0, 0, 0)

    const count = trip.responses.filter((response) => {
      if (!response.availabilityStart || !response.availabilityEnd) return false
      const availableFrom = new Date(response.availabilityStart)
      const availableTo = new Date(response.availabilityEnd)
      availableFrom.setHours(0, 0, 0, 0)
      availableTo.setHours(23, 59, 59, 999)
      return date >= availableFrom && date <= availableTo
    }).length

    dayCounts.push({ date, count })
    cursor.setDate(cursor.getDate() + 1)
  }

  const windows: TripPlanSuggestions['bestDateWindows'] = []

  for (let startIndex = 0; startIndex <= dayCounts.length - duration; startIndex += 1) {
    const slice = dayCounts.slice(startIndex, startIndex + duration)
    const totalAvailable = slice.reduce((sum, day) => sum + day.count, 0)
    const perfectDays = slice.filter((day) => day.count === totalParticipants).length

    windows.push({
      startDate: slice[0].date.toISOString(),
      endDate: slice[slice.length - 1].date.toISOString(),
      averageAvailable: totalAvailable / slice.length,
      perfectDays,
    })
  }

  return windows
    .sort((a, b) => {
      if (b.averageAvailable !== a.averageAvailable) return b.averageAvailable - a.averageAvailable
      if (b.perfectDays !== a.perfectDays) return b.perfectDays - a.perfectDays
      return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    })
    .slice(0, 3)
}

function buildTripPlanSuggestions(trip: TripWithResponses): TripPlanSuggestions {
  const tripStart = normalizeDate(trip.startDate)
  const tripEnd = normalizeDate(trip.endDate)
  const suggestedDurationDays = Math.min(
    4,
    Math.max(1, Math.floor((tripEnd.getTime() - tripStart.getTime()) / (1000 * 60 * 60 * 24)) + 1),
  )

  return {
    topDestinations: countLabels(trip.responses.flatMap((response) => response.destinations)).slice(0, 4),
    commonInterests: countLabels(trip.responses.flatMap((response) => response.interests)).slice(0, 4),
    budgetPreferences: countLabels(trip.responses.map((response) => response.budget).filter(Boolean)).slice(0, 4),
    bestDateWindows: getDateWindowSuggestions(trip),
    suggestedDurationDays,
  }
}

async function ensureTripPlan(tripId: string) {
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
      plan: {
        include: {
          todos: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      },
    },
  })

  if (!trip) {
    return null
  }

  if (trip.plan) {
    return trip
  }

  const createdPlan = await prisma.tripPlan.create({
    data: {
      id: generateId(10),
      tripId,
      finalDestination: '',
      finalStartDate: null,
      finalEndDate: null,
      itineraryIdeas: '',
      lodgingNotes: '',
      transportationNotes: '',
      budgetNotes: '',
      groupNotes: '',
    },
    include: {
      todos: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  })

  return {
    ...trip,
    plan: createdPlan,
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

  return mapTripWithResponses(trip)
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

export async function getTripPlanPageData(tripId: string): Promise<TripPlanPageData | null> {
  const trip = await ensureTripPlan(tripId)

  if (!trip || !trip.plan) {
    return null
  }

  const tripWithResponses = mapTripWithResponses(trip)

  return {
    trip: tripWithResponses,
    plan: mapTripPlanRecord(trip.plan),
    suggestions: buildTripPlanSuggestions(tripWithResponses),
  }
}

export async function updateTripPlan(tripId: string, input: UpdateTripPlanInput): Promise<TripPlanRecord> {
  const trip = await ensureTripPlan(tripId)

  if (!trip || !trip.plan) {
    throw new Error('Trip not found.')
  }

  const finalDestination = input.finalDestination?.trim()
  const finalStartDate = input.finalStartDate === undefined ? trip.plan.finalStartDate : input.finalStartDate
  const finalEndDate = input.finalEndDate === undefined ? trip.plan.finalEndDate : input.finalEndDate

  if (finalStartDate && finalEndDate) {
    if (normalizeDate(finalStartDate) > normalizeDate(finalEndDate)) {
      throw new Error('Finalized start date must be before finalized end date.')
    }
  }

  const plan = await prisma.tripPlan.update({
    where: {
      tripId,
    },
    data: {
      finalDestination: finalDestination ?? trip.plan.finalDestination,
      finalStartDate: finalStartDate ?? null,
      finalEndDate: finalEndDate ?? null,
      itineraryIdeas: input.itineraryIdeas?.trim() ?? trip.plan.itineraryIdeas,
      lodgingNotes: input.lodgingNotes?.trim() ?? trip.plan.lodgingNotes,
      transportationNotes: input.transportationNotes?.trim() ?? trip.plan.transportationNotes,
      budgetNotes: input.budgetNotes?.trim() ?? trip.plan.budgetNotes,
      groupNotes: input.groupNotes?.trim() ?? trip.plan.groupNotes,
    },
    include: {
      todos: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  })

  return mapTripPlanRecord(plan)
}

export async function createTripPlanTodo(tripId: string, input: CreateTripPlanTodoInput): Promise<TripPlanTodoRecord> {
  const trip = await ensureTripPlan(tripId)

  if (!trip || !trip.plan) {
    throw new Error('Trip not found.')
  }

  const text = input.text.trim()

  if (!text) {
    throw new Error('Todo text is required.')
  }

  const todo = await prisma.tripPlanTodo.create({
    data: {
      id: generateId(10),
      tripPlanId: trip.plan.id,
      text,
      completed: false,
    },
  })

  return mapTripPlanTodoRecord(todo)
}

export async function updateTripPlanTodo(
  tripId: string,
  todoId: string,
  input: UpdateTripPlanTodoInput,
): Promise<TripPlanTodoRecord> {
  const trip = await ensureTripPlan(tripId)

  if (!trip || !trip.plan) {
    throw new Error('Trip not found.')
  }

  const existingTodo = await prisma.tripPlanTodo.findFirst({
    where: {
      id: todoId,
      tripPlanId: trip.plan.id,
    },
  })

  if (!existingTodo) {
    throw new Error('Todo not found.')
  }

  const nextText = input.text === undefined ? existingTodo.text : input.text.trim()

  if (!nextText) {
    throw new Error('Todo text is required.')
  }

  const todo = await prisma.tripPlanTodo.update({
    where: {
      id: todoId,
    },
    data: {
      text: nextText,
      completed: input.completed ?? existingTodo.completed,
    },
  })

  return mapTripPlanTodoRecord(todo)
}

export async function deleteTripPlanTodo(tripId: string, todoId: string): Promise<void> {
  const trip = await ensureTripPlan(tripId)

  if (!trip || !trip.plan) {
    throw new Error('Trip not found.')
  }

  const existingTodo = await prisma.tripPlanTodo.findFirst({
    where: {
      id: todoId,
      tripPlanId: trip.plan.id,
    },
    select: {
      id: true,
    },
  })

  if (!existingTodo) {
    throw new Error('Todo not found.')
  }

  await prisma.tripPlanTodo.delete({
    where: {
      id: todoId,
    },
  })
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
