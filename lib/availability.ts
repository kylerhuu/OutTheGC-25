import { parseStoredDate, toDateOnlyString } from '@/lib/date-utils'
import type { PublicResponseRecord } from '@/lib/trip-types'

export interface BestDateWindow {
  startDate: string
  endDate: string
  averageAvailable: number
  minAvailable: number
}

export interface AvailabilitySpan {
  startDate: string
  endDate: string
  availableCount: number
}

export function getTripLengthDays(startDate: string, endDate: string) {
  return Math.max(
    1,
    Math.floor(
      (parseStoredDate(endDate).getTime() - parseStoredDate(startDate).getTime()) / (1000 * 60 * 60 * 24),
    ) + 1,
  )
}

export function getBestDateWindows(
  responses: PublicResponseRecord[],
  tripDateRange: { startDate: string; endDate: string },
  duration: number,
  limit = 3,
): BestDateWindow[] {
  const tripStart = parseStoredDate(tripDateRange.startDate)
  const tripEnd = parseStoredDate(tripDateRange.endDate)
  const days: Array<{ date: Date; count: number }> = []
  const cursor = new Date(tripStart)
  const safeDuration = Math.max(1, duration)

  while (cursor <= tripEnd) {
    const day = new Date(cursor)
    day.setHours(0, 0, 0, 0)

    const count = responses.filter((response) => {
      if (!response.availabilityStart || !response.availabilityEnd) return false
      const availableFrom = parseStoredDate(response.availabilityStart)
      const availableTo = parseStoredDate(response.availabilityEnd)
      availableFrom.setHours(0, 0, 0, 0)
      availableTo.setHours(23, 59, 59, 999)
      return day >= availableFrom && day <= availableTo
    }).length

    days.push({ date: new Date(day), count })
    cursor.setDate(cursor.getDate() + 1)
  }

  if (responses.length === 0 || days.length < safeDuration) {
    return []
  }

  const windows: BestDateWindow[] = []

  for (let startIndex = 0; startIndex <= days.length - safeDuration; startIndex += 1) {
    const slice = days.slice(startIndex, startIndex + safeDuration)
    const totalAvailable = slice.reduce((sum, item) => sum + item.count, 0)

    windows.push({
      startDate: toDateOnlyString(slice[0].date),
      endDate: toDateOnlyString(slice[slice.length - 1].date),
      averageAvailable: totalAvailable / slice.length,
      minAvailable: slice.reduce((lowest, item) => Math.min(lowest, item.count), slice[0]?.count ?? 0),
    })
  }

  const distinct: BestDateWindow[] = []
  const sorted = windows.sort((a, b) => {
    if (b.averageAvailable !== a.averageAvailable) return b.averageAvailable - a.averageAvailable
    if (b.minAvailable !== a.minAvailable) return b.minAvailable - a.minAvailable
    return parseStoredDate(a.startDate).getTime() - parseStoredDate(b.startDate).getTime()
  })

  for (const window of sorted) {
    const start = parseStoredDate(window.startDate)
    const end = parseStoredDate(window.endDate)
    const overlapsExisting = distinct.some((existing) => {
      const existingStart = parseStoredDate(existing.startDate)
      const existingEnd = parseStoredDate(existing.endDate)
      return start <= existingEnd && end >= existingStart
    })

    if (!overlapsExisting) {
      distinct.push(window)
    }

    if (distinct.length === limit) {
      break
    }
  }

  return distinct
}

export function getBestAvailabilitySpans(
  responses: PublicResponseRecord[],
  tripDateRange: { startDate: string; endDate: string },
): AvailabilitySpan[] {
  const tripStart = parseStoredDate(tripDateRange.startDate)
  const tripEnd = parseStoredDate(tripDateRange.endDate)
  const days: Array<{ date: Date; count: number }> = []
  const cursor = new Date(tripStart)

  while (cursor <= tripEnd) {
    const day = new Date(cursor)
    day.setHours(0, 0, 0, 0)

    const count = responses.filter((response) => {
      if (!response.availabilityStart || !response.availabilityEnd) return false
      const availableFrom = parseStoredDate(response.availabilityStart)
      const availableTo = parseStoredDate(response.availabilityEnd)
      availableFrom.setHours(0, 0, 0, 0)
      availableTo.setHours(23, 59, 59, 999)
      return day >= availableFrom && day <= availableTo
    }).length

    days.push({ date: new Date(day), count })
    cursor.setDate(cursor.getDate() + 1)
  }

  if (days.length === 0) {
    return []
  }

  const maxCount = Math.max(...days.map((day) => day.count))
  if (maxCount <= 0) {
    return []
  }

  const spans: AvailabilitySpan[] = []
  let currentStart: Date | null = null
  let currentEnd: Date | null = null

  for (const day of days) {
    if (day.count === maxCount) {
      if (!currentStart) {
        currentStart = new Date(day.date)
      }
      currentEnd = new Date(day.date)
      continue
    }

    if (currentStart && currentEnd) {
      spans.push({
        startDate: toDateOnlyString(currentStart),
        endDate: toDateOnlyString(currentEnd),
        availableCount: maxCount,
      })
    }
    currentStart = null
    currentEnd = null
  }

  if (currentStart && currentEnd) {
    spans.push({
      startDate: toDateOnlyString(currentStart),
      endDate: toDateOnlyString(currentEnd),
      availableCount: maxCount,
    })
  }

  return spans
}
