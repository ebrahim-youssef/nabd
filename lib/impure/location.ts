import { logger } from '@/lib/logger'

import { isNativePlatform } from './native'

// Geolocation + local coordinate cache (ADR-0009). Coordinates never leave the device: they
// live in localStorage (not Dexie, not synced) purely to recompute prayer times offline on
// later visits. Inside the Android shell (NBD-46) the Capacitor plugin carries the native
// permission flow; the browser path is unchanged.

export type Coords = { latitude: number; longitude: number }

// Why a location request came back empty (NBD-48 follow-up — the owner's device showed the
// Capacitor "Location services are not enabled" case, which is the phone's GPS toggle, a
// different fix for the user than a denied app permission).
export type LocationFailure = 'services-disabled' | 'denied' | 'unavailable'

export type LocationRequest = { ok: true; coords: Coords } | { ok: false; reason: LocationFailure }

// Per-reason user-facing copy, shared by every surface with an enable button (settings,
// prayer-times page, onboarding) so the same failure never reads differently across the app.
export const LOCATION_FAILURE_COPY: Record<LocationFailure, string> = {
  'services-disabled':
    'خدمة الموقع (GPS) مغلقة في جهازك — فعّلها من إعدادات الجهاز ثم أعد المحاولة.',
  denied: 'تم رفض صلاحية الموقع — امنح التطبيق صلاحية الموقع ثم أعد المحاولة.',
  unavailable: 'تعذّر الحصول على الموقع — أعد المحاولة لاحقًا.',
}

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

// Classifies a thrown Capacitor Geolocation error. The plugin throws
// "Location services are not enabled" when the device-wide GPS toggle is off — the case the
// owner hit; permission wording covers a dismissed/denied dialog on older plugin paths.
export function classifyNativeGeoError(cause: unknown): LocationFailure {
  const message = (cause instanceof Error ? cause.message : String(cause)).toLowerCase()
  if (message.includes('location services')) return 'services-disabled'
  if (message.includes('denied') || message.includes('permission')) return 'denied'
  return 'unavailable'
}

async function requestNativeCoords(): Promise<LocationRequest> {
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
      return { ok: false, reason: 'denied' }
    }
    const position = await Geolocation.getCurrentPosition()
    const coords: Coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    }
    cacheAndAnnounce(coords)
    return { ok: true, coords }
  } catch (cause) {
    const reason = classifyNativeGeoError(cause)
    logger.error('location.requestNativeCoords failed', cause, { reason })
    return { ok: false, reason }
  }
}

// Web GeolocationPositionError.code 1 is PERMISSION_DENIED; 2/3 (unavailable/timeout) are
// environmental.
const WEB_PERMISSION_DENIED = 1

// Prompts the permission dialog (must be called from a user gesture). Never throws — a failed
// request resolves `{ ok: false, reason }` so callers can tell the user what to actually fix
// (GPS off vs permission denied vs try again).
export function requestCoords(): Promise<LocationRequest> {
  if (isNativePlatform()) return requestNativeCoords()
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      logger.warn('location.requestCoords: geolocation API unavailable', {})
      resolve({ ok: false, reason: 'unavailable' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        cacheAndAnnounce(coords)
        resolve({ ok: true, coords })
      },
      (error) => {
        logger.warn('location.requestCoords: getCurrentPosition error', {
          code: error.code,
          message: error.message,
        })
        resolve({
          ok: false,
          reason: error.code === WEB_PERMISSION_DENIED ? 'denied' : 'unavailable',
        })
      },
    )
  })
}
