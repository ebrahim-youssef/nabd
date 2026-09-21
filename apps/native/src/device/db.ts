import {
  DEFAULT_NOTIFICATION_PREFS,
  parseNotificationPrefs,
  type NotificationPrefs,
} from '@nabd/shared'

import { createPreferencesRepository, PREFERENCE_KEYS } from '../preferences/db'
import type { ProductDatabase } from '../db/productDatabase'

export const LOCATION_CACHE_MAX_AGE_MS = 10 * 60 * 1000

export type CachedLocation = {
  latitude: number
  longitude: number
  city: string | null
  recordedAt: number
}

export type LocationCacheState = CachedLocation & {
  fresh: boolean
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

export function createDeviceRepository(database: ProductDatabase) {
  const preferences = createPreferencesRepository(database)

  return {
    async readCachedLocation(): Promise<CachedLocation | null> {
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
        parsedLatitude < -90 ||
        parsedLatitude > 90 ||
        parsedLongitude < -180 ||
        parsedLongitude > 180
      ) {
        return null
      }
      return {
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        city: city?.trim() || null,
        recordedAt: parsedRecordedAt,
      }
    },

    async writeCachedLocation(
      location: { latitude: number; longitude: number; city?: string | null },
      recordedAt: number,
    ): Promise<void> {
      if (
        !Number.isFinite(location.latitude) ||
        !Number.isFinite(location.longitude) ||
        location.latitude < -90 ||
        location.latitude > 90 ||
        location.longitude < -180 ||
        location.longitude > 180 ||
        !Number.isFinite(recordedAt)
      ) {
        throw new Error('Invalid cached location')
      }
      const previous = await this.readCachedLocation()
      const city = location.city?.trim() || previous?.city || null
      await Promise.all([
        preferences.write(PREFERENCE_KEYS.latitude, String(location.latitude), recordedAt),
        preferences.write(PREFERENCE_KEYS.longitude, String(location.longitude), recordedAt),
        preferences.write(PREFERENCE_KEYS.locationRecordedAt, String(recordedAt), recordedAt),
        city
          ? preferences.write(PREFERENCE_KEYS.city, city, recordedAt)
          : preferences.clear(PREFERENCE_KEYS.city),
      ])
    },

    async clearCachedLocation(): Promise<void> {
      await Promise.all([
        preferences.clear(PREFERENCE_KEYS.latitude),
        preferences.clear(PREFERENCE_KEYS.longitude),
        preferences.clear(PREFERENCE_KEYS.city),
        preferences.clear(PREFERENCE_KEYS.locationRecordedAt),
      ])
    },

    async readNotificationPrefs(): Promise<NotificationPrefs> {
      const value = await preferences.read(PREFERENCE_KEYS.notifications)
      if (!value) return DEFAULT_NOTIFICATION_PREFS
      try {
        return parseNotificationPrefs(JSON.parse(value))
      } catch {
        return DEFAULT_NOTIFICATION_PREFS
      }
    },

    async writeNotificationPrefs(value: NotificationPrefs, updatedAt: number): Promise<void> {
      await preferences.write(PREFERENCE_KEYS.notifications, JSON.stringify(value), updatedAt)
    },

    async readAlarmOnSilent(): Promise<boolean> {
      return (await preferences.read(PREFERENCE_KEYS.alarmOnSilent)) === 'true'
    },

    async writeAlarmOnSilent(value: boolean, updatedAt: number): Promise<void> {
      await preferences.write(PREFERENCE_KEYS.alarmOnSilent, String(value), updatedAt)
    },

    async readLocationCacheState(now: number): Promise<LocationCacheState | null> {
      const cached = await this.readCachedLocation()
      return cached
        ? { ...cached, fresh: now - cached.recordedAt <= LOCATION_CACHE_MAX_AGE_MS }
        : null
    },
  }
}
