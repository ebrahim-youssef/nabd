import { DatabaseSync } from 'node:sqlite'

import { migrateDatabase, type MigrationDatabase } from '../../db/database'
import type { ProductDatabase, SqlValue } from '../../db/productDatabase'
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
  let connection: DatabaseSync
  let database: ProductDatabase & MigrationDatabase
  let repository: ReturnType<typeof createDeviceRepository>

  beforeEach(async () => {
    const created = createDatabase()
    connection = created.connection
    database = created.database
    await migrateDatabase(database)
    repository = createDeviceRepository(database)
  })

  afterEach(() => {
    connection.close()
  })

  it('persists and restores coordinates, city, and acquisition time', async () => {
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
  })

  it('keeps the last city when a later lookup has no result', async () => {
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
  })

  it('marks cache fresh through ten minutes and stale afterward', async () => {
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
  })

  it('rejects invalid coordinates and acquisition times', async () => {
    await expect(
      repository.writeCachedLocation({ latitude: 91, longitude: 31 }, 1_000),
    ).rejects.toThrow('Invalid cached location')
    await expect(
      repository.writeCachedLocation({ latitude: 30, longitude: 31 }, -1),
    ).rejects.toThrow('Invalid cached location')
  })
})
