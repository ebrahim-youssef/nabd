import type { ProductDatabase } from '../db/productDatabase'

export const PREFERENCE_KEYS = {
  celebratedDay: 'nabd:celebrated-day',
  calculationMethod: 'nabd:prayer-calculation-method',
  latitude: 'nabd:cached-latitude',
  longitude: 'nabd:cached-longitude',
  locationRecordedAt: 'nabd:cached-location-recorded-at',
  theme: 'nabd:theme',
} as const

export type PreferenceKey = (typeof PREFERENCE_KEYS)[keyof typeof PREFERENCE_KEYS]

type PreferenceRow = { value: string }

const SELECT_PREFERENCE = 'SELECT value FROM app_preferences WHERE key = ?'
const WRITE_PREFERENCE = `INSERT INTO app_preferences (key, value, updated_at)
  VALUES (?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
const CLEAR_PREFERENCE = 'DELETE FROM app_preferences WHERE key = ?'

export function createPreferencesRepository(database: ProductDatabase) {
  return {
    async read(key: PreferenceKey): Promise<string | null> {
      const row = await database.getFirstAsync<PreferenceRow>(SELECT_PREFERENCE, key)
      return row?.value ?? null
    },

    async write(key: PreferenceKey, value: string, updatedAt: number): Promise<void> {
      await database.runAsync(WRITE_PREFERENCE, key, value, updatedAt)
    },

    async clear(key: PreferenceKey): Promise<void> {
      await database.runAsync(CLEAR_PREFERENCE, key)
    },
  }
}
