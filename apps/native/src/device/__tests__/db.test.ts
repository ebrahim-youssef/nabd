import { DatabaseSync } from 'node:sqlite'

import { migrateDatabase, type MigrationDatabase } from '../../db/database'
import type { ProductDatabase, SqlValue } from '../../db/productDatabase'
import { PREFERENCE_KEYS } from '../../preferences/db'
import { createDeviceRepository } from '../db'

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
      } catch (error) {
        connection.exec('ROLLBACK')
        throw error
      }
    },
  }
  return { connection, database }
}

describe('device SQLite repository', () => {
  it('persists and restores a successful coordinate and city lookup', async () => {
    const { connection, database } = createDatabase()
    try {
      await migrateDatabase(database)
      const repository = createDeviceRepository(database)

      await repository.writeCachedLocation(
        { latitude: 30.0444, longitude: 31.2357, city: 'القاهرة' },
        1_000,
      )

      await expect(repository.readCachedLocation()).resolves.toEqual({
        latitude: 30.0444,
        longitude: 31.2357,
        city: 'القاهرة',
        recordedAt: 1_000,
      })
    } finally {
      connection.close()
    }
  })

  it('keeps the last city when a fresh lookup has no reverse-geocode result', async () => {
    const { connection, database } = createDatabase()
    try {
      await migrateDatabase(database)
      const repository = createDeviceRepository(database)
      await repository.writeCachedLocation(
        { latitude: 30.0444, longitude: 31.2357, city: 'القاهرة' },
        1_000,
      )
      await repository.writeCachedLocation(
        { latitude: 30.0500, longitude: 31.2400, city: null },
        2_000,
      )

      await expect(repository.readCachedLocation()).resolves.toEqual({
        latitude: 30.05,
        longitude: 31.24,
        city: 'القاهرة',
        recordedAt: 2_000,
      })
    } finally {
      connection.close()
    }
  })

  it('persists notification preferences independently from the native snapshot', async () => {
    const { connection, database } = createDatabase()
    try {
      await migrateDatabase(database)
      const repository = createDeviceRepository(database)
      await repository.writeNotificationPrefs(
        {
          enabled: true,
          beforeAdhan: false,
          atAdhan: true,
          atIqamah: false,
          morningAdhkar: true,
          eveningAdhkar: false,
        },
        1_000,
      )
      await expect(repository.readNotificationPrefs()).resolves.toEqual({
        enabled: true,
        beforeAdhan: false,
        atAdhan: true,
        atIqamah: false,
        morningAdhkar: true,
        eveningAdhkar: false,
      })
      expect(PREFERENCE_KEYS.notifications).toBe('nabd:notification-prefs')
    } finally {
      connection.close()
    }
  })
})
