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

  it('persists and restores coordinates and acquisition time', async () => {
    await repository.writeCachedLocation({ latitude: 30.0444, longitude: 31.2357 }, 1_000)

    await expect(repository.readLocationCacheState(1_000)).resolves.toEqual({
      latitude: 30.0444,
      longitude: 31.2357,
      recordedAt: 1_000,
      fresh: true,
    })
  })

  it('marks cache fresh through ten minutes and stale afterward', async () => {
    await repository.writeCachedLocation({ latitude: 30.0444, longitude: 31.2357 }, 1_000)

    await expect(
      repository.readLocationCacheState(1_000 + LOCATION_CACHE_MAX_AGE_MS),
    ).resolves.toMatchObject({
      fresh: true,
    })
    await expect(
      repository.readLocationCacheState(1_001 + LOCATION_CACHE_MAX_AGE_MS),
    ).resolves.toMatchObject({ fresh: false })
  })

  it('marks a recorded time in the future as stale', async () => {
    await repository.writeCachedLocation({ latitude: 30.0444, longitude: 31.2357 }, 2_000)

    await expect(repository.readLocationCacheState(1_000)).resolves.toMatchObject({
      recordedAt: 2_000,
      fresh: false,
    })
  })

  it('rolls back all coordinates when one write fails', async () => {
    await repository.writeCachedLocation({ latitude: 10, longitude: 20 }, 1_000)
    const runAsync = database.runAsync.bind(database)
    const transaction = jest.spyOn(database, 'withExclusiveTransactionAsync')
    jest.spyOn(database, 'runAsync').mockImplementation(async (source, ...parameters) => {
      if (parameters[0] === PREFERENCE_KEYS.locationRecordedAt) {
        throw new Error('recorded-at write failed')
      }
      return runAsync(source, ...parameters)
    })

    await expect(
      repository.writeCachedLocation({ latitude: 30, longitude: 31 }, 2_000),
    ).rejects.toThrow('recorded-at write failed')

    expect(transaction).toHaveBeenCalledTimes(1)
    await expect(repository.readLocationCacheState(2_000)).resolves.toEqual({
      latitude: 10,
      longitude: 20,
      recordedAt: 1_000,
      fresh: true,
    })
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
