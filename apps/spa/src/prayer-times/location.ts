import type { Coords, LocationRequest } from '@nabd/shared'

import { logger } from '../logger'

// Browser geolocation and the local coordinate cache. Coordinates live in localStorage rather than
// Dexie because they are a device preference, not user history: their only job is to recompute
// prayer times offline on a later visit.

const COORDS_KEY = 'nabd:coords'

// Fired on window after a successful grant so every mounted consumer — the checklist sub-header and
// each per-prayer badge — picks the coordinates up without a remount.
export const COORDS_EVENT = 'nabd:coords'

// GeolocationPositionError.PERMISSION_DENIED. Codes 2 and 3 (position unavailable, timeout) are
// environmental and worth retrying, so only this one is the user's decision.
const PERMISSION_DENIED = 1

export function readCachedCoords(): Coords | null {
  try {
    const raw = window.localStorage.getItem(COORDS_KEY)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (
      typeof value !== 'object' ||
      value === null ||
      !('latitude' in value) ||
      !('longitude' in value) ||
      typeof value.latitude !== 'number' ||
      typeof value.longitude !== 'number'
    ) {
      return null
    }
    return { latitude: value.latitude, longitude: value.longitude }
  } catch {
    return null
  }
}

// Prompts for permission, so it must be called from a user gesture. Never throws: a failed request
// resolves `{ ok: false, reason }` so the caller can tell the user what to actually fix. The SPA
// never produces `services-disabled` — that reason describes the phone's own GPS toggle, which the
// browser cannot see, and it stays in the shared type for the native implementation.
export function requestCoords(): Promise<LocationRequest> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      logger.warn('location.requestCoords: geolocation API unavailable')
      resolve({ ok: false, reason: 'unavailable' })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        try {
          window.localStorage.setItem(COORDS_KEY, JSON.stringify(coords))
        } catch {
          // Location remains useful for this session when storage is unavailable.
        }
        window.dispatchEvent(new Event(COORDS_EVENT))
        resolve({ ok: true, coords })
      },
      (error) => {
        // A breadcrumb rather than an error: this is the line that separates "the user declined" from
        // "the fix failed" when the only report available is that the enable button did nothing.
        logger.warn('location.requestCoords: getCurrentPosition error', {
          code: error.code,
          message: error.message,
        })
        resolve({
          ok: false,
          reason: error.code === PERMISSION_DENIED ? 'denied' : 'unavailable',
        })
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 10 * 60_000 },
    )
  })
}
