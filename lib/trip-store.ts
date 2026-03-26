import { prisma } from '@/lib/prisma'
import { parseComparableDate, toDateOnlyString } from '@/lib/date-utils'
import { getBestAvailabilitySpans, getBestDateWindows, getTripLengthDays } from '@/lib/availability'
import type {
  CreateResponseInput,
  CreateTripInput,
  CreateTripPlanTodoInput,
  PublicResponseRecord,
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

function normalizeInterestName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function normalizeDate(value: string) {
  return parseComparableDate(value)
}

function isDateWithinUnavailableRanges(
  date: Date,
  unavailableRanges: Array<{ startDate: string; endDate: string }> | undefined,
) {
  return (unavailableRanges ?? []).some((range) => {
    const start = normalizeDate(range.startDate)
    const end = normalizeDate(range.endDate)
    return date >= start && date <= end
  })
}

function normalizeUnavailableRanges(
  unavailableRanges: Array<{ startDate: string; endDate: string }> | undefined,
) {
  const normalized = (unavailableRanges ?? [])
    .map((range) => ({
      startDate: range.startDate.trim(),
      endDate: range.endDate.trim(),
    }))
    .filter((range) => range.startDate && range.endDate)

  normalized.sort((a, b) => normalizeDate(a.startDate).getTime() - normalizeDate(b.startDate).getTime())

  const merged: Array<{ startDate: string; endDate: string }> = []

  for (const range of normalized) {
    const currentStart = normalizeDate(range.startDate)
    const currentEnd = normalizeDate(range.endDate)
    const previous = merged[merged.length - 1]

    if (!previous) {
      merged.push({
        startDate: toDateOnlyString(currentStart),
        endDate: toDateOnlyString(currentEnd),
      })
      continue
    }

    const previousStart = normalizeDate(previous.startDate)
    const previousEnd = normalizeDate(previous.endDate)

    if (currentStart.getTime() <= previousEnd.getTime() + 24 * 60 * 60 * 1000) {
      const nextEnd = new Date(Math.max(previousEnd.getTime(), currentEnd.getTime()))
      previous.startDate = toDateOnlyString(previousStart)
      previous.endDate = toDateOnlyString(nextEnd)
    } else {
      merged.push({
        startDate: toDateOnlyString(currentStart),
        endDate: toDateOnlyString(currentEnd),
      })
    }
  }

  return merged
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

function mergeInterestOptions(defaults: string[], shared: string[]) {
  const seen = new Set<string>()
  const merged: string[] = []

  for (const item of [...defaults, ...shared]) {
    const normalized = normalizeInterestName(item)
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
  interestOptions?: Array<{ name: string }>
}): TripRecord {
  return {
    id: trip.id,
    name: trip.name,
    description: trip.description,
    startDate: trip.startDate,
    endDate: trip.endDate,
    createdAt: trip.createdAt.toISOString(),
    destinationOptions: trip.destinationOptions?.map((option) => option.name) ?? [],
    interestOptions: trip.interestOptions?.map((option) => option.name) ?? [],
  }
}

function mapResponseRecord(response: {
  id: string
  tripId: string
  name: string
  editCode: string
  availabilityStart: string | null
  availabilityEnd: string | null
  unavailableRanges?: Array<{ startDate: string; endDate: string }>
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
    unavailableRanges: response.unavailableRanges?.map((range) => ({
      startDate: range.startDate,
      endDate: range.endDate,
    })) ?? [],
    destinations: response.destinations,
    budget: response.budget,
    interests: response.interests,
    notes: response.notes,
    submittedAt: response.submittedAt.toISOString(),
    updatedAt: response.updatedAt.toISOString(),
  }
}

function mapPublicResponseRecord(response: {
  id: string
  tripId: string
  name: string
  availabilityStart: string | null
  availabilityEnd: string | null
  unavailableRanges?: Array<{ startDate: string; endDate: string }>
  destinations: string[]
  budget: string
  interests: string[]
  notes: string
  submittedAt: Date
  updatedAt: Date
}): PublicResponseRecord {
  return {
    id: response.id,
    tripId: response.tripId,
    name: response.name,
    availabilityStart: response.availabilityStart,
    availabilityEnd: response.availabilityEnd,
    unavailableRanges: response.unavailableRanges?.map((range) => ({
      startDate: range.startDate,
      endDate: range.endDate,
    })) ?? [],
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
  interestOptions?: Array<{ name: string }>
  responses: Array<{
    id: string
    tripId: string
    name: string
    editCode: string
    availabilityStart: string | null
    availabilityEnd: string | null
    unavailableRanges?: Array<{ startDate: string; endDate: string }>
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
    responses: trip.responses.map(mapPublicResponseRecord),
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
  housingNotes: string
  attractionNotes: string
  foodNotes: string
  activityNotes: string
  dayPlanNotes: string
  transportationNotes: string
  bookingNotes: string
  otherNotes: string
  finalDocContent: string
  itineraryIdeas: string
  lodgingNotes: string
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
    housingNotes: plan.housingNotes || plan.lodgingNotes,
    attractionNotes: plan.attractionNotes,
    foodNotes: plan.foodNotes,
    activityNotes: plan.activityNotes,
    dayPlanNotes: plan.dayPlanNotes || plan.itineraryIdeas,
    transportationNotes: plan.transportationNotes,
    bookingNotes: plan.bookingNotes || plan.budgetNotes,
    otherNotes: plan.otherNotes || plan.groupNotes,
    finalDocContent: plan.finalDocContent,
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
  const totalParticipants = trip.responses.length

  if (totalParticipants === 0) {
    return []
  }

  const duration = Math.min(4, getTripLengthDays(trip.startDate, trip.endDate))

  return getBestDateWindows(
    trip.responses,
    { startDate: trip.startDate, endDate: trip.endDate },
    duration,
  ).map((window) => ({
    startDate: window.startDate,
    endDate: window.endDate,
    averageAvailable: window.averageAvailable,
    perfectDays: window.minAvailable === totalParticipants ? duration : 0,
  }))
}

function getSuggestedDurationDays(trip: TripWithResponses) {
  const tripLength = Math.min(4, getTripLengthDays(trip.startDate, trip.endDate))
  const bestSpans = getBestAvailabilitySpans(trip.responses, {
    startDate: trip.startDate,
    endDate: trip.endDate,
  })

  if (bestSpans.length === 0) {
    return tripLength
  }

  const longestBestSpan = Math.max(
    ...bestSpans.map((span) => getTripLengthDays(span.startDate, span.endDate)),
  )

  return Math.max(1, Math.min(tripLength, longestBestSpan))
}

function buildTripPlanSuggestions(trip: TripWithResponses): TripPlanSuggestions {
  return {
    topDestinations: countLabels(trip.responses.flatMap((response) => response.destinations)).slice(0, 4),
    commonInterests: countLabels(trip.responses.flatMap((response) => response.interests)).slice(0, 4),
    budgetPreferences: countLabels(trip.responses.map((response) => response.budget).filter(Boolean)).slice(0, 4),
    bestDateWindows: getDateWindowSuggestions(trip),
    suggestedDurationDays: getSuggestedDurationDays(trip),
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
      interestOptions: {
        orderBy: {
          createdAt: 'asc',
        },
      },
      responses: {
        orderBy: {
          submittedAt: 'asc',
        },
        include: {
          unavailableRanges: {
            orderBy: {
              startDate: 'asc',
            },
          },
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
      housingNotes: '',
      attractionNotes: '',
      foodNotes: '',
      activityNotes: '',
      dayPlanNotes: '',
      transportationNotes: '',
      bookingNotes: '',
      otherNotes: '',
      finalDocContent: '',
      itineraryIdeas: '',
      lodgingNotes: '',
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
      interestOptions: true,
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
      interestOptions: {
        orderBy: {
          createdAt: 'asc',
        },
      },
      responses: {
        orderBy: {
          submittedAt: 'asc',
        },
        include: {
          unavailableRanges: {
            orderBy: {
              startDate: 'asc',
            },
          },
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

async function syncTripInterestOptions(tripId: string, interests: string[]) {
  const normalizedInterests = interests
    .map((interest) => ({
      name: interest.trim().replace(/\s+/g, ' '),
      normalizedName: normalizeInterestName(interest),
    }))
    .filter((interest) => interest.normalizedName)

  if (normalizedInterests.length === 0) {
    return
  }

  await prisma.$transaction(
    normalizedInterests.map((interest) =>
      prisma.tripInterest.upsert({
        where: {
          tripId_normalizedName: {
            tripId,
            normalizedName: interest.normalizedName,
          },
        },
        update: {},
        create: {
          id: generateId(10),
          tripId,
          name: interest.name,
          normalizedName: interest.normalizedName,
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
  const unavailableRanges = normalizeUnavailableRanges(input.unavailableRanges)
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

    for (const range of unavailableRanges) {
      const blockedStart = normalizeDate(range.startDate)
      const blockedEnd = normalizeDate(range.endDate)

      if (blockedStart > blockedEnd) {
        throw new Error('Blocked dates must start before they end.')
      }

      if (blockedStart < availabilityStart || blockedEnd > availabilityEnd) {
        throw new Error('Blocked dates must stay inside your availability range.')
      }
    }
  } else if (unavailableRanges.length > 0) {
    throw new Error('Choose your general availability before adding blocked dates.')
  }

  await syncTripDestinationOptions(tripId, destinations)
  await syncTripInterestOptions(tripId, interests)

  const normalizedEditCode = input.editCode?.trim() || ''

  const response = await prisma.tripResponse.create({
    data: {
      id: generateId(10),
      tripId,
      name,
      editCode: normalizedEditCode,
      availabilityStart: input.availabilityStart || null,
      availabilityEnd: input.availabilityEnd || null,
      unavailableRanges: {
        create: unavailableRanges.map((range) => ({
          id: generateId(10),
          startDate: range.startDate,
          endDate: range.endDate,
        })),
      },
      destinations,
      budget: input.budget || '',
      interests,
      notes: input.notes?.trim() || '',
    },
    include: {
      unavailableRanges: {
        orderBy: {
          startDate: 'asc',
        },
      },
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
    include: {
      unavailableRanges: true,
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
  const unavailableRanges = normalizeUnavailableRanges(input.unavailableRanges)
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

    for (const range of unavailableRanges) {
      const blockedStart = normalizeDate(range.startDate)
      const blockedEnd = normalizeDate(range.endDate)

      if (blockedStart > blockedEnd) {
        throw new Error('Blocked dates must start before they end.')
      }

      if (blockedStart < availabilityStart || blockedEnd > availabilityEnd) {
        throw new Error('Blocked dates must stay inside your availability range.')
      }
    }
  } else if (unavailableRanges.length > 0) {
    throw new Error('Choose your general availability before adding blocked dates.')
  }

  await syncTripDestinationOptions(tripId, destinations)
  await syncTripInterestOptions(tripId, interests)

  const response = await prisma.tripResponse.update({
    where: {
      id: responseId,
    },
    data: {
      availabilityStart: input.availabilityStart || null,
      availabilityEnd: input.availabilityEnd || null,
      unavailableRanges: {
        deleteMany: {},
        create: unavailableRanges.map((range) => ({
          id: generateId(10),
          startDate: range.startDate,
          endDate: range.endDate,
        })),
      },
      destinations,
      budget: input.budget || '',
      interests,
      notes: input.notes?.trim() || '',
    },
    include: {
      unavailableRanges: {
        orderBy: {
          startDate: 'asc',
        },
      },
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
    include: {
      unavailableRanges: {
        orderBy: {
          startDate: 'asc',
        },
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
      housingNotes: input.housingNotes?.trim() ?? trip.plan.housingNotes,
      attractionNotes: input.attractionNotes?.trim() ?? trip.plan.attractionNotes,
      foodNotes: input.foodNotes?.trim() ?? trip.plan.foodNotes,
      activityNotes: input.activityNotes?.trim() ?? trip.plan.activityNotes,
      dayPlanNotes: input.dayPlanNotes?.trim() ?? trip.plan.dayPlanNotes,
      transportationNotes: input.transportationNotes?.trim() ?? trip.plan.transportationNotes,
      bookingNotes: input.bookingNotes?.trim() ?? trip.plan.bookingNotes,
      otherNotes: input.otherNotes?.trim() ?? trip.plan.otherNotes,
      finalDocContent: input.finalDocContent?.trim() ?? trip.plan.finalDocContent,
      itineraryIdeas: input.dayPlanNotes?.trim() ?? trip.plan.itineraryIdeas,
      lodgingNotes: input.housingNotes?.trim() ?? trip.plan.lodgingNotes,
      budgetNotes: input.bookingNotes?.trim() ?? trip.plan.budgetNotes,
      groupNotes: input.otherNotes?.trim() ?? trip.plan.groupNotes,
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

const DEFAULT_INTEREST_OPTIONS = [
  'Beach',
  'Mountains',
  'City',
  'Culture',
  'Food & Dining',
  'Adventure',
  'Nightlife',
  'Nature',
  'Shopping',
  'Relaxation',
  'Wellness & Spa',
  'Museums & History',
  'Live Music',
  'Road Trip',
  'Scenic Views',
  'Sports & Games',
]

export function getInterestOptions(trip: TripRecord) {
  return mergeInterestOptions(DEFAULT_INTEREST_OPTIONS, trip.interestOptions)
}
