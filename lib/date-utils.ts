const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function toDateOnlyString(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseStoredDate(value: string) {
  const normalized = DATE_ONLY_PATTERN.test(value) ? new Date(`${value}T12:00:00`) : new Date(value)

  if (Number.isNaN(normalized.getTime())) {
    throw new Error('Invalid date provided.')
  }

  return normalized
}

export function parseComparableDate(value: string) {
  const normalized = DATE_ONLY_PATTERN.test(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(value)

  if (Number.isNaN(normalized.getTime())) {
    throw new Error('Invalid date provided.')
  }

  return normalized
}
