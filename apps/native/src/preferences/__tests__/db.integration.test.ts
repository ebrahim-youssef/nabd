import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { migrateDatabase, type MigrationDatabase } from '../../db/database'
import type { ProductDatabase, SqlValue } from '../../db/productDatabase'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../db'

function createDatabaseAt(directory: string) {
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

function createDatabase() {
  return createDatabaseAt(mkdtempSync(join(tmpdir(), 'nabd-preferences-')))
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

  it('retains appearance and calculation preferences after a process-death reopen', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'nabd-preferences-reopen-'))
    const first = createDatabaseAt(directory)
    try {
      await migrateDatabase(first.database)
      const preferences = createPreferencesRepository(first.database)
      await preferences.write(PREFERENCE_KEYS.theme, 'dark', 100)
      await preferences.write(PREFERENCE_KEYS.mode, 'modern', 101)
      await preferences.write(PREFERENCE_KEYS.calculationMethod, 'umm_al_qura', 102)
      first.connection.close()

      const reopened = createDatabaseAt(directory)
      try {
        const reopenedPreferences = createPreferencesRepository(reopened.database)
        await expect(reopenedPreferences.read(PREFERENCE_KEYS.theme)).resolves.toBe('dark')
        await expect(reopenedPreferences.read(PREFERENCE_KEYS.mode)).resolves.toBe('modern')
        await expect(reopenedPreferences.read(PREFERENCE_KEYS.calculationMethod)).resolves.toBe(
          'umm_al_qura',
        )
      } finally {
        reopened.connection.close()
      }
    } finally {
      try {
        first.connection.close()
      } catch {
        // The first connection was closed before the reopen; cleanup remains best effort.
      }
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
