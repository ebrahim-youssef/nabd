import { DatabaseSync } from 'node:sqlite'

import { migrateDatabase, type MigrationDatabase } from '../../db/database'
import type { ProductDatabase, SqlValue } from '../../db/productDatabase'
import { PREFERENCE_KEYS } from '../../preferences/db'
import { createDeviceRepository } from '../db'

const LOCATION_CACHE_MAX_AGE_MS = 10 * 60 * 1000

function createDatabase() {
  const connection = new DatabaseSync(':memory:')
  const database: ProductDatabase & MigrationDatabase = {
    async execAsync(source: string) {
      connection.exec(source)
    },
    async getFirstAsync<T>(source: string, ...parameters: SqlValue[]) {
      return (connection.prepare(source).get(...parameters) as T | undefined) ?? null
    },
    async getAllAsync<T>(source: string, ...parameters: SqlValue[]) {
      return connection.prepare(source).all(...parameters) as T[]
    },
    async runAsync(source: string, ...parameters: SqlValue[]) {
      return connection.prepare(source).run(...parameters)
    },
    async withExclusiveTransactionAsync(task) {
      connection.exec('BEGIN EXCLUSIVE')
      try {
        await task(database)
        connection.exec('COMMIT')
      } catch (cause) {
        connection.exec('ROLLBACK')
        throw cause
      }
    },
  }
  return { connection, database }
}

describe('device location SQLite repository', () => {
  it('persists and restores coordinates, city, and acquisition time', async () => {
    const { connection, database } = createDatabase()
    try {
      await migrateDatabase(database)
      const repository = createDeviceRepository(database)

      await repository.writeCachedLocation(
        { latitude: 30.0444, longitude: 31.2357, city: 'القاهرة' },
        1_000,
      )

      await expect(repository.readLocationCacheState(1_000)).resolves.toEqual({
        latitude: 30.0444,
        longitude: 31.2357,
        city: 'القاهرة',
        recordedAt: 1_000,
        fresh: true,
      })
    } finally {
      connection.close()
    }
  })

  it('keeps the last city when a later lookup has no result', async () => {
    const { connection, database } = createDatabase()
    try {
      await migrateDatabase(database)
      const repository = createDeviceRepository(database)
      await repository.writeCachedLocation(
        { latitude: 30.0444, longitude: 31.2357, city: 'القاهرة' },
        1_000,
      )
      await repository.writeCachedLocation({ latitude: 30.05, longitude: 31.24, city: null }, 2_000)

      await expect(repository.readLocationCacheState(2_000)).resolves.toEqual({
        latitude: 30.05,
        longitude: 31.24,
        city: 'القاهرة',
        recordedAt: 2_000,
        fresh: true,
      })
    } finally {
      connection.close()
    }
  })

  it('marks cache fresh through ten minutes and stale afterward', async () => {
    const { connection, database } = createDatabase()
    try {
      await migrateDatabase(database)
      const repository = createDeviceRepository(database)
      await repository.writeCachedLocation(
        { latitude: 30.0444, longitude: 31.2357, city: 'القاهرة' },
        1_000,
      )

      await expect(
        repository.readLocationCacheState(1_000 + LOCATION_CACHE_MAX_AGE_MS),
      ).resolves.toMatchObject({
        fresh: true,
      })
      await expect(
        repository.readLocationCacheState(1_001 + LOCATION_CACHE_MAX_AGE_MS),
      ).resolves.toMatchObject({ fresh: false })
    } finally {
      connection.close()
    }
  })

  it('rejects invalid coordinates and acquisition times', async () => {
    const { connection, database } = createDatabase()
    try {
      await migrateDatabase(database)
      const repository = createDeviceRepository(database)

      await expect(
        repository.writeCachedLocation({ latitude: 91, longitude: 31 }, 1_000),
      ).rejects.toThrow('Invalid cached location')
      await expect(
        repository.writeCachedLocation({ latitude: 30, longitude: 31 }, -1),
      ).rejects.toThrow('Invalid cached location')
    } finally {
      connection.close()
    }
  })

  it('uses the location preference keys without a mode key', () => {
    expect(PREFERENCE_KEYS.latitude).toBe('nabd:cached-latitude')
    expect(PREFERENCE_KEYS.longitude).toBe('nabd:cached-longitude')
    expect(PREFERENCE_KEYS.city).toBe('nabd:cached-city')
    expect(PREFERENCE_KEYS.locationRecordedAt).toBe('nabd:cached-location-recorded-at')
    expect(Object.prototype.hasOwnProperty.call(PREFERENCE_KEYS, 'mode')).toBe(false)
  })
})
