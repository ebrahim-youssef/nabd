import { createPreferencesRepository, PREFERENCE_KEYS } from '../preferences/db'
import type { ProductDatabase } from '../db/productDatabase'
import { logger } from '../observability/logger'

export const LOCATION_CACHE_MAX_AGE_MINUTES = 10
const MINUTE_MS = 60 * 1000
export const LOCATION_CACHE_MAX_AGE_MS = LOCATION_CACHE_MAX_AGE_MINUTES * MINUTE_MS
const MIN_LATITUDE = -90
const MAX_LATITUDE = 90
const MIN_LONGITUDE = -180
const MAX_LONGITUDE = 180

export type CachedLocation = {
  latitude: number
  longitude: number
  city: string | null
  recordedAt: number
}

export type LocationCacheState = CachedLocation & {
  fresh: boolean
}

type LocationInput = {
  latitude: number
  longitude: number
  city?: string | null
}

function parseFinite(value: string | null): number | null {
  if (value === null || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseRecordedAt(value: string | null): number | null {
  const parsed = parseFinite(value)
  return parsed !== null && parsed >= 0 ? parsed : null
}

function parseCity(value: string | null): string | null {
  if (value === null) return null
  return value.trim() || null
}

function validLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_LATITUDE && value <= MAX_LATITUDE
}

function validLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_LONGITUDE && value <= MAX_LONGITUDE
}

function validRecordedAt(value: number): boolean {
  return Number.isFinite(value) && value >= 0
}

export function createDeviceRepository(database: ProductDatabase) {
  const preferences = createPreferencesRepository(database)

  async function loadCachedLocation(): Promise<CachedLocation | null> {
    const [latitude, longitude, city, recordedAt] = await Promise.all([
      preferences.read(PREFERENCE_KEYS.latitude),
      preferences.read(PREFERENCE_KEYS.longitude),
      preferences.read(PREFERENCE_KEYS.city),
      preferences.read(PREFERENCE_KEYS.locationRecordedAt),
    ])
    const parsedLatitude = parseFinite(latitude)
    const parsedLongitude = parseFinite(longitude)
    const parsedRecordedAt = parseRecordedAt(recordedAt)
    if (
      parsedLatitude === null ||
      parsedLongitude === null ||
      parsedRecordedAt === null ||
      !validLatitude(parsedLatitude) ||
      !validLongitude(parsedLongitude)
    ) {
      return null
    }
    return {
      latitude: parsedLatitude,
      longitude: parsedLongitude,
      city: parseCity(city),
      recordedAt: parsedRecordedAt,
    }
  }

  async function readCachedLocation(): Promise<CachedLocation | null> {
    try {
      return await loadCachedLocation()
    } catch (cause: unknown) {
      logger.error('Native location cache read failed', cause, { operation: 'read' })
      throw cause
    }
  }

  async function writeCachedLocation(location: LocationInput, recordedAt: number): Promise<void> {
    if (
      !validLatitude(location.latitude) ||
      !validLongitude(location.longitude) ||
      !validRecordedAt(recordedAt) ||
      (location.city !== undefined && location.city !== null && typeof location.city !== 'string')
    ) {
      throw new Error('Invalid cached location')
    }

    try {
      const previous = await loadCachedLocation()
      const requestedCity = typeof location.city === 'string' ? location.city.trim() : ''
      const city = requestedCity || previous?.city || null
      await Promise.all([
        preferences.write(PREFERENCE_KEYS.latitude, String(location.latitude), recordedAt),
        preferences.write(PREFERENCE_KEYS.longitude, String(location.longitude), recordedAt),
        preferences.write(PREFERENCE_KEYS.locationRecordedAt, String(recordedAt), recordedAt),
        city
          ? preferences.write(PREFERENCE_KEYS.city, city, recordedAt)
          : preferences.clear(PREFERENCE_KEYS.city),
      ])
    } catch (cause: unknown) {
      logger.error('Native location cache write failed', cause, { operation: 'write' })
      throw cause
    }
  }

  async function clearCachedLocation(): Promise<void> {
    try {
      await Promise.all([
        preferences.clear(PREFERENCE_KEYS.latitude),
        preferences.clear(PREFERENCE_KEYS.longitude),
        preferences.clear(PREFERENCE_KEYS.city),
        preferences.clear(PREFERENCE_KEYS.locationRecordedAt),
      ])
    } catch (cause: unknown) {
      logger.error('Native location cache clear failed', cause, { operation: 'clear' })
      throw cause
    }
  }

  async function readLocationCacheState(now: number): Promise<LocationCacheState | null> {
    const cached = await readCachedLocation()
    return cached
      ? { ...cached, fresh: now - cached.recordedAt <= LOCATION_CACHE_MAX_AGE_MS }
      : null
  }

  return {
    readCachedLocation,
    writeCachedLocation,
    clearCachedLocation,
    readLocationCacheState,
  }
}
