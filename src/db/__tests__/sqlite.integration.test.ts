import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { WIRD_LEVELS } from '../../content/levels'

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
  it('migrates, completes onboarding, closes, and restores from one database file', async () => {
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
             (id, effective_from, definition_json, created_at)
             VALUES (?, ?, ?, ?)`,
        )
        .run('future-level', '2026-08-11', JSON.stringify(WIRD_LEVELS[0].wird), 200)
      expect(
        reopenedConnection.prepare('SELECT COUNT(*) AS count FROM wird_versions').get(),
      ).toEqual({ count: 2 })
      reopenedConnection.close()
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('migrates version four data to version five without changing existing entries', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'nabd-v4-migration-'))
    const connection = new DatabaseSync(join(directory, 'nabd.db'))
    try {
      const database = createAdapter(connection)
      await migrateDatabase(database as MigrationDatabase)
      connection
        .prepare(
          `INSERT INTO wird_versions
           (id, effective_from, definition_json, created_at)
         VALUES (?, ?, ?, ?)`,
        )
        .run('version-v4', '2026-08-10', JSON.stringify(WIRD_LEVELS[0].wird), 100)
      connection
        .prepare(
          `INSERT INTO wird_entries
           (id, day, version_id, item_id, done, at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run('entry-v4', '2026-08-10', 'version-v4', WIRD_LEVELS[0].wird.items[0].id, 1, 101)
      connection
        .prepare(
          `INSERT INTO onboarding_state
           (id, answers_json, selected_level_id, completed_at, effective_from, wird_version_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(1, '{"prayers":"always"}', 'level-1', 102, '2026-08-10', 'version-v4')
      connection
        .prepare('INSERT INTO qada_events (id, prayer_id, delta, at) VALUES (?, ?, ?, ?)')
        .run('qada-v4', 'fajr', 1, 103)
      connection
        .prepare(
          `INSERT INTO adhkar_flow_progress
           (category_id, day, "index", count, finished)
         VALUES (?, ?, ?, ?, ?)`,
        )
        .run('morning', '2026-08-10', 2, 3, 0)
      connection
        .prepare('INSERT INTO app_preferences (key, value, updated_at) VALUES (?, ?, ?)')
        .run('nabd:theme', 'dark', 104)
      connection.exec('DROP TABLE wird_actions; UPDATE schema_version SET version = 4 WHERE id = 1')

      await expect(migrateDatabase(database as MigrationDatabase)).resolves.toBe(5)
      expect(
        connection
          .prepare('PRAGMA table_info(wird_entries)')
          .all()
          .map((row) => row.name),
      ).toEqual(['id', 'day', 'version_id', 'item_id', 'done', 'at'])
      expect(connection.prepare('SELECT * FROM wird_versions').all()).toEqual([
        {
          id: 'version-v4',
          effective_from: '2026-08-10',
          definition_json: JSON.stringify(WIRD_LEVELS[0].wird),
          created_at: 100,
        },
      ])
      expect(connection.prepare('SELECT * FROM wird_entries').all()).toEqual([
        {
          id: 'entry-v4',
          day: '2026-08-10',
          version_id: 'version-v4',
          item_id: WIRD_LEVELS[0].wird.items[0].id,
          done: 1,
          at: 101,
        },
      ])
      expect(connection.prepare('SELECT * FROM onboarding_state').all()).toEqual([
        {
          id: 1,
          answers_json: '{"prayers":"always"}',
          selected_level_id: 'level-1',
          completed_at: 102,
          effective_from: '2026-08-10',
          wird_version_id: 'version-v4',
        },
      ])
      expect(connection.prepare('SELECT * FROM qada_events').all()).toEqual([
        { id: 'qada-v4', prayer_id: 'fajr', delta: 1, at: 103 },
      ])
      expect(connection.prepare('SELECT * FROM adhkar_flow_progress').all()).toEqual([
        { category_id: 'morning', day: '2026-08-10', index: 2, count: 3, finished: 0 },
      ])
      expect(connection.prepare('SELECT * FROM app_preferences').all()).toEqual([
        { key: 'nabd:theme', value: 'dark', updated_at: 104 },
      ])
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
