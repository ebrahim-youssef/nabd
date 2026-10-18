import type { Coords } from '@nabd/shared'

import { logger } from '../observability/logger'
import { PREFERENCE_KEYS } from '../preferences/db'

const REVERSE_GEOCODE_ENDPOINT = 'https://api.bigdatacloud.net/data/reverse-geocode-client'
const COORDINATE_DECIMAL_PLACES = 2
export const REVERSE_GEOCODE_TIMEOUT_MS = 5_000

type CityPreferenceKey = typeof PREFERENCE_KEYS.city | typeof PREFERENCE_KEYS.cityCoordinates

export type CityPreferenceStore = {
  read: (key: CityPreferenceKey) => Promise<string | null>
  write: (key: CityPreferenceKey, value: string, updatedAt: number) => Promise<void>
}

type ReverseGeocodeResponse = {
  city?: unknown
  locality?: unknown
  principalSubdivision?: unknown
}

function cachedCity(value: string | null): string | null {
  const city = value?.trim()
  return city ? city : null
}

type CachedCity = { city: string | null; coordinatesKey: string | null }

async function readCachedCity(preferences: CityPreferenceStore): Promise<CachedCity> {
  try {
    const [city, coordinatesKey] = await Promise.all([
      preferences.read(PREFERENCE_KEYS.city),
      preferences.read(PREFERENCE_KEYS.cityCoordinates),
    ])
    return { city: cachedCity(city), coordinatesKey }
  } catch (cause: unknown) {
    logger.warn('Reverse geocode city cache read failed', { operation: 'read', error: cause })
    return { city: null, coordinatesKey: null }
  }
}

function responseCity(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null
  const response = data as ReverseGeocodeResponse
  for (const value of [response.city, response.locality, response.principalSubdivision]) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

export async function resolveCityLabel(
  coordinates: Coords,
  countdownEnabled: boolean,
  preferences: CityPreferenceStore,
  updatedAt = Date.now(),
): Promise<string | null> {
  if (!countdownEnabled) return null

  const latitude = coordinates.latitude.toFixed(COORDINATE_DECIMAL_PLACES)
  const longitude = coordinates.longitude.toFixed(COORDINATE_DECIMAL_PLACES)
  const coordinatesKey = `${latitude},${longitude}`
  const { city: cached, coordinatesKey: cachedCoordinatesKey } = await readCachedCity(preferences)
  // ADR-0009 Amendment 1: coordinates leave the device once per place, not on every sync.
  if (cached && cachedCoordinatesKey === coordinatesKey) return cached
  const controller = new AbortController()
  let timedOut = false
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true
      controller.abort()
      reject(new Error('Reverse geocode request timed out'))
    }, REVERSE_GEOCODE_TIMEOUT_MS)
  })

  try {
    const request = fetch(
      `${REVERSE_GEOCODE_ENDPOINT}?latitude=${latitude}&longitude=${longitude}&localityLanguage=ar`,
      { signal: controller.signal },
    )
    const response = await Promise.race([request, timeout])
    if (!response.ok) {
      logger.warn('Reverse geocode request returned a non-success status', {
        reason: 'non-2xx',
        status: response.status,
      })
      return cached
    }

    let data: unknown
    try {
      data = await response.json()
    } catch {
      logger.warn('Reverse geocode response could not be decoded', {
        reason: 'malformed-response',
      })
      return cached
    }

    const city = responseCity(data)
    if (!city) {
      logger.warn('Reverse geocode response did not contain a city', {
        reason: 'malformed-response',
      })
      return cached
    }

    try {
      await preferences.write(PREFERENCE_KEYS.city, city, updatedAt)
      await preferences.write(PREFERENCE_KEYS.cityCoordinates, coordinatesKey, updatedAt)
    } catch (cause: unknown) {
      logger.warn('Reverse geocode city cache write failed', { operation: 'write', error: cause })
    }
    return city
  } catch {
    logger.warn('Reverse geocode request failed', {
      reason: timedOut ? 'timeout' : 'offline-or-network-failure',
    })
    return cached
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId)
  }
}
