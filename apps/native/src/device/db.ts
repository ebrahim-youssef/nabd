import { createPreferencesRepository, PREFERENCE_KEYS } from '../preferences/db'
import type { ProductDatabase } from '../db/productDatabase'
import { logger } from '../observability/logger'

const LOCATION_CACHE_MAX_AGE_MINUTES = 10
const MINUTE_MS = 60 * 1000
const LOCATION_CACHE_MAX_AGE_MS = LOCATION_CACHE_MAX_AGE_MINUTES * MINUTE_MS
const MIN_LATITUDE = -90
const MAX_LATITUDE = 90
const MIN_LONGITUDE = -180
const MAX_LONGITUDE = 180

export type CachedLocation = {
  latitude: number
  longitude: number
  recordedAt: number
}

type LocationCacheState = CachedLocation & {
  fresh: boolean
}

type LocationInput = {
  latitude: number
  longitude: number
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
    const [latitude, longitude, recordedAt] = await Promise.all([
      preferences.read(PREFERENCE_KEYS.latitude),
      preferences.read(PREFERENCE_KEYS.longitude),
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
      !validRecordedAt(recordedAt)
    ) {
      throw new Error('Invalid cached location')
    }

    try {
      await database.withExclusiveTransactionAsync(async (transaction) => {
        const transactionPreferences = createPreferencesRepository(transaction)
        await transactionPreferences.write(
          PREFERENCE_KEYS.latitude,
          String(location.latitude),
          recordedAt,
        )
        await transactionPreferences.write(
          PREFERENCE_KEYS.longitude,
          String(location.longitude),
          recordedAt,
        )
        await transactionPreferences.write(
          PREFERENCE_KEYS.locationRecordedAt,
          String(recordedAt),
          recordedAt,
        )
      })
    } catch (cause: unknown) {
      logger.error('Native location cache write failed', cause, { operation: 'write' })
      throw cause
    }
  }

  async function readLocationCacheState(now: number): Promise<LocationCacheState | null> {
    const cached = await readCachedLocation()
    if (!cached) return null
    const ageMs = now - cached.recordedAt
    return { ...cached, fresh: ageMs >= 0 && ageMs <= LOCATION_CACHE_MAX_AGE_MS }
  }

  return {
    writeCachedLocation,
    readLocationCacheState,
  }
}
