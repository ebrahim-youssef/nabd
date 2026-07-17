import { logger } from '@/lib/logger'

import { isNativePlatform } from './native'

// Geolocation + local coordinate cache (ADR-0009). Coordinates never leave the device: they
// live in localStorage (not Dexie, not synced) purely to recompute prayer times offline on
// later visits. Inside the Android shell (NBD-46) the Capacitor plugin carries the native
// permission flow; the browser path is unchanged.

export type Coords = { latitude: number; longitude: number }

const STORAGE_KEY = 'nabd:coords'

// Fired on window after a successful grant so every mounted consumer (status bar, per-prayer
// badges) picks the coordinates up without a remount.
export const COORDS_EVENT = 'nabd:coords'

export function readCachedCoords(): Coords | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Coords
    if (typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

function cacheAndAnnounce(coords: Coords): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(coords))
  } catch {
    // Cache miss only costs a re-prompt next session.
  }
  window.dispatchEvent(new Event(COORDS_EVENT))
}

async function requestNativeCoords(): Promise<Coords | null> {
  try {
    const { Geolocation } = await import('@capacitor/geolocation')
    const permission = await Geolocation.requestPermissions()
    if (permission.location !== 'granted' && permission.coarseLocation !== 'granted') {
      // A breadcrumb (not an error): the user declined the native prompt. Distinguishes a
      // denial from a plugin/GPS failure when diagnosing the "button does nothing" report.
      logger.warn('location.requestNativeCoords: permission not granted', {
        location: permission.location,
        coarseLocation: permission.coarseLocation,
      })
      return null
    }
    const position = await Geolocation.getCurrentPosition()
    const coords: Coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    }
    cacheAndAnnounce(coords)
    return coords
  } catch (cause) {
    logger.error('location.requestNativeCoords failed', cause, {})
    return null
  }
}

// Prompts the permission dialog (must be called from a user gesture). Resolves null when
// denied/unavailable — callers show the quiet prompt state, nothing throws.
export function requestCoords(): Promise<Coords | null> {
  if (isNativePlatform()) return requestNativeCoords()
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      logger.warn('location.requestCoords: geolocation API unavailable', {})
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        cacheAndAnnounce(coords)
        resolve(coords)
      },
      (error) => {
        logger.warn('location.requestCoords: getCurrentPosition error', {
          code: error.code,
          message: error.message,
        })
        resolve(null)
      },
    )
  })
}
