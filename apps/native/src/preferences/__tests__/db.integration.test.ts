import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { migrateDatabase, type MigrationDatabase } from '../../db/database'
import type { ProductDatabase, SqlValue } from '../../db/productDatabase'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../db'

function createDatabase() {
  const directory = mkdtempSync(join(tmpdir(), 'nabd-preferences-'))
  const connection = new DatabaseSync(join(directory, 'nabd.db'))
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
  return { connection, database, directory }
}

describe('native preference SQLite store', () => {
  it('writes, reads, overwrites, and clears the celebrated day', async () => {
    const { connection, database, directory } = createDatabase()
    try {
      await migrateDatabase(database)
      const preferences = createPreferencesRepository(database)

      await preferences.write(PREFERENCE_KEYS.celebratedDay, '2026-09-14', 100)
      await expect(preferences.read(PREFERENCE_KEYS.celebratedDay)).resolves.toBe('2026-09-14')

      await preferences.write(PREFERENCE_KEYS.celebratedDay, '2026-09-15', 200)
      await expect(preferences.read(PREFERENCE_KEYS.celebratedDay)).resolves.toBe('2026-09-15')

      await preferences.clear(PREFERENCE_KEYS.celebratedDay)
      await expect(preferences.read(PREFERENCE_KEYS.celebratedDay)).resolves.toBeNull()
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
