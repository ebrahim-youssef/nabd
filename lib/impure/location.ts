// Browser geolocation + local coordinate cache (ADR-0009). Coordinates never leave the
// device: they live in localStorage (not Dexie, not synced) purely to recompute prayer
// times offline on later visits.

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

// Prompts the browser permission dialog (must be called from a user gesture). Resolves null
// when denied/unavailable — callers show the quiet prompt state, nothing throws.
export function requestCoords(): Promise<Coords | null> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: Coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(coords))
        } catch {
          // Cache miss only costs a re-prompt next session.
        }
        window.dispatchEvent(new Event(COORDS_EVENT))
        resolve(coords)
      },
      () => resolve(null),
    )
  })
}
