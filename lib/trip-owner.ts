const OWNER_TOKEN_STORAGE_PREFIX = 'outthegc:owner-token:'

export function getTripOwnerStorageKey(tripId: string) {
  return `${OWNER_TOKEN_STORAGE_PREFIX}${tripId}`
}

export function storeTripOwnerToken(tripId: string, ownerToken: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(getTripOwnerStorageKey(tripId), ownerToken)
}

export function readTripOwnerToken(tripId: string) {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(getTripOwnerStorageKey(tripId))
}
