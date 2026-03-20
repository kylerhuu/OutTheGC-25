export interface TripRecord {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  createdAt: string
}

export interface ResponseRecord {
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
  submittedAt: string
  updatedAt: string
}

export interface TripWithResponses extends TripRecord {
  responses: ResponseRecord[]
}

export interface CreateTripInput {
  name: string
  description?: string
  startDate: string
  endDate: string
}

export interface CreateResponseInput {
  name: string
  availabilityStart?: string | null
  availabilityEnd?: string | null
  destinations?: string[]
  budget?: string
  interests?: string[]
  notes?: string
  editCode?: string
}
