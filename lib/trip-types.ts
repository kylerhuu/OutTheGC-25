export interface TripRecord {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  createdAt: string
  destinationOptions: string[]
  interestOptions: string[]
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

export interface PublicResponseRecord {
  id: string
  tripId: string
  name: string
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
  responses: PublicResponseRecord[]
}

export interface TripPlanTodoRecord {
  id: string
  tripPlanId: string
  text: string
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface TripPlanRecord {
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
  createdAt: string
  updatedAt: string
  todos: TripPlanTodoRecord[]
}

export interface PlanSuggestionCount {
  label: string
  count: number
}

export interface PlanDateWindow {
  startDate: string
  endDate: string
  averageAvailable: number
  perfectDays: number
}

export interface TripPlanSuggestions {
  topDestinations: PlanSuggestionCount[]
  commonInterests: PlanSuggestionCount[]
  budgetPreferences: PlanSuggestionCount[]
  bestDateWindows: PlanDateWindow[]
  suggestedDurationDays: number
}

export interface TripPlanPageData {
  trip: TripWithResponses
  plan: TripPlanRecord
  suggestions: TripPlanSuggestions
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

export interface RecoverResponseInput {
  name: string
  editCode: string
}

export interface UpdateTripPlanInput {
  finalDestination?: string
  finalStartDate?: string | null
  finalEndDate?: string | null
  housingNotes?: string
  attractionNotes?: string
  foodNotes?: string
  activityNotes?: string
  dayPlanNotes?: string
  transportationNotes?: string
  bookingNotes?: string
  otherNotes?: string
  finalDocContent?: string
}

export interface CreateTripPlanTodoInput {
  text: string
}

export interface UpdateTripPlanTodoInput {
  text?: string
  completed?: boolean
}
