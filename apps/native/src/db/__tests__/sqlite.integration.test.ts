import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { WIRD_LEVELS } from '@nabd/shared'

import { createOnboardingRepository, type OnboardingDatabase } from '../../onboarding/db'
import { migrateDatabase, type MigrationDatabase } from '../database'

type SqlValue = string | number | null

type SqliteAdapter = {
  execAsync(source: string): Promise<void>
  getFirstAsync<T>(source: string, ...parameters: SqlValue[]): Promise<T | null>
  runAsync(source: string, ...parameters: SqlValue[]): Promise<unknown>
  withExclusiveTransactionAsync(task: (transaction: SqliteAdapter) => Promise<void>): Promise<void>
}

function createAdapter(database: DatabaseSync) {
  const adapter: SqliteAdapter = {
    async execAsync(source: string): Promise<void> {
      database.exec(source)
    },
    async getFirstAsync<T>(source: string, ...parameters: SqlValue[]): Promise<T | null> {
      return (database.prepare(source).get(...parameters) as T | undefined) ?? null
    },
    async runAsync(source: string, ...parameters: SqlValue[]): Promise<unknown> {
      return database.prepare(source).run(...parameters)
    },
    async withExclusiveTransactionAsync(
      task: (transaction: SqliteAdapter) => Promise<void>,
    ): Promise<void> {
      database.exec('BEGIN EXCLUSIVE')
      try {
        await task(adapter)
        database.exec('COMMIT')
      } catch (cause) {
        database.exec('ROLLBACK')
        throw cause
      }
    },
  }
  return adapter
}

describe('native SQLite persistence integration', () => {
  it('migrates, completes onboarding, closes, and restores from the same database file', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'nabd-native-sqlite-'))
    const path = join(directory, 'nabd.db')
    try {
      const firstConnection = new DatabaseSync(path)
      const firstAdapter = createAdapter(firstConnection)
      await migrateDatabase(firstAdapter as MigrationDatabase)
      await createOnboardingRepository(firstAdapter as OnboardingDatabase).complete({
        answers: { prayers: 'always', quran: 'hizb', adhkar: 'daily' },
        selectedLevelId: 'level-3',
        completedAt: 100,
        effectiveFrom: '2026-08-10',
        versionId: 'initial-wird-level-3',
      })
      firstConnection.close()

      const reopenedConnection = new DatabaseSync(path)
      const reopenedAdapter = createAdapter(reopenedConnection)
      await migrateDatabase(reopenedAdapter as MigrationDatabase)
      await expect(
        createOnboardingRepository(reopenedAdapter as OnboardingDatabase).load(),
      ).resolves.toMatchObject({
        selectedLevelId: 'level-3',
        activeWird: {
          id: 'initial-wird-level-3',
          definition: WIRD_LEVELS[2].wird,
        },
      })

      reopenedConnection
        .prepare(
          `INSERT INTO wird_versions
            (id, level_id, effective_from, definition_json, created_at)
            VALUES (?, ?, ?, ?, ?)`,
        )
        .run('future-level', 'level-1', '2026-08-11', JSON.stringify(WIRD_LEVELS[0].wird), 200)
      expect(
        reopenedConnection.prepare('SELECT COUNT(*) AS count FROM wird_versions').get(),
      ).toEqual({ count: 2 })
      reopenedConnection.close()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
