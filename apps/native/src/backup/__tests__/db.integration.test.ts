import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { migrateDatabase, type MigrationDatabase } from '../../db/database'
import type { ProductDatabase, SqlValue } from '../../db/productDatabase'
import { parseBackup, serializeBackup, type BackupEnvelope, type BackupRows } from '../logic'
import { createBackupRepository } from '../db'

type BackupDatabase = ProductDatabase & MigrationDatabase

const rows: BackupRows = {
  onboarding_state: [
    {
      id: 1,
      answers_json: '{"q1":"often"}',
      selected_level_id: 'level-1',
      completed_at: 1_760_000_000_000,
      effective_from: '2026-10-18',
      wird_version_id: 'version-1',
    },
  ],
  wird_versions: [
    {
      id: 'version-1',
      effective_from: '2026-10-18',
      definition_json: '{"areas":[],"items":[]}',
      created_at: 1_760_000_000_000,
    },
  ],
  wird_entries: [
    {
      id: 'entry-1',
      day: '2026-10-18',
      version_id: 'version-1',
      item_id: 'item-1',
      done: 1,
      at: 1_760_000_000_000,
    },
  ],
  qada_events: [{ id: 'qada-1', prayer_id: 'fajr', delta: 1, at: 1_760_000_000_000 }],
  adhkar_flow_progress: [
    { category_id: 'morning', day: '2026-10-18', index: 2, count: 3, finished: 0 },
  ],
  app_preferences: [{ key: 'nabd:theme', value: 'dark', updated_at: 1_760_000_000_000 }],
}

function adapter(database: DatabaseSync, failInsert?: () => boolean): BackupDatabase {
  const value = {
    async execAsync(sql: string) {
      database.exec(sql)
    },
    async getFirstAsync<T>(sql: string, ...parameters: SqlValue[]) {
      return (database.prepare(sql).get(...parameters) as T | undefined) ?? null
    },
    async getAllAsync<T>(sql: string, ...parameters: SqlValue[]) {
      return database.prepare(sql).all(...parameters) as T[]
    },
    async runAsync(sql: string, ...parameters: SqlValue[]) {
      if (failInsert?.()) throw new Error('injected SQLite failure')
      return database.prepare(sql).run(...parameters)
    },
    async withExclusiveTransactionAsync(task: (transaction: BackupDatabase) => Promise<void>) {
      database.exec('BEGIN EXCLUSIVE')
      try {
        await task(value)
        database.exec('COMMIT')
      } catch (error) {
        database.exec('ROLLBACK')
        throw error
      }
    },
  }
  return value
}

function fresh() {
  const directory = mkdtempSync(join(tmpdir(), 'nabd-backup-'))
  const connection = new DatabaseSync(join(directory, 'nabd.db'))
  return { directory, connection }
}

async function seed(database: BackupDatabase, value: BackupRows): Promise<void> {
  for (const row of value.wird_versions) {
    await database.runAsync(
      'INSERT INTO wird_versions (id, effective_from, definition_json, created_at) VALUES (?, ?, ?, ?)',
      row.id,
      row.effective_from,
      row.definition_json,
      row.created_at,
    )
  }
  for (const row of value.wird_entries) {
    await database.runAsync(
      'INSERT INTO wird_entries (id, day, version_id, item_id, done, at) VALUES (?, ?, ?, ?, ?, ?)',
      row.id,
      row.day,
      row.version_id,
      row.item_id,
      row.done,
      row.at,
    )
  }
  for (const row of value.onboarding_state) {
    await database.runAsync(
      'INSERT INTO onboarding_state (id, answers_json, selected_level_id, completed_at, effective_from, wird_version_id) VALUES (?, ?, ?, ?, ?, ?)',
      row.id,
      row.answers_json,
      row.selected_level_id,
      row.completed_at,
      row.effective_from,
      row.wird_version_id,
    )
  }
  for (const row of value.qada_events) {
    await database.runAsync(
      'INSERT INTO qada_events (id, prayer_id, delta, at) VALUES (?, ?, ?, ?)',
      row.id,
      row.prayer_id,
      row.delta,
      row.at,
    )
  }
  for (const row of value.adhkar_flow_progress) {
    await database.runAsync(
      'INSERT INTO adhkar_flow_progress (category_id, day, "index", count, finished) VALUES (?, ?, ?, ?, ?)',
      row.category_id,
      row.day,
      row.index,
      row.count,
      row.finished,
    )
  }
  for (const row of value.app_preferences) {
    await database.runAsync(
      'INSERT INTO app_preferences (key, value, updated_at) VALUES (?, ?, ?)',
      row.key,
      row.value,
      row.updated_at,
    )
  }
}

function validBackup(value: BackupRows): BackupEnvelope {
  const parsed = parseBackup(serializeBackup(value, '2026-10-18T10:00:00.000Z'))
  if (!parsed.ok) throw new Error(parsed.error)
  return parsed.value
}

async function migratedDatabase() {
  const value = fresh()
  const database = adapter(value.connection)
  await migrateDatabase(database)
  return { ...value, database }
}

afterEach(() => {
  jest.restoreAllMocks()
})

describe('backup SQLite repository', () => {
  it('restores a snapshot onto a fresh database with identical rows', async () => {
    const source = await migratedDatabase()
    const target = await migratedDatabase()
    try {
      await seed(source.database, rows)
      const snapshot = await createBackupRepository(source.database).readSnapshot()

      await expect(
        createBackupRepository(target.database).restore(validBackup(snapshot)),
      ).resolves.toEqual({
        ok: true,
        value: {
          onboarding_state: 1,
          wird_versions: 1,
          wird_entries: 1,
          qada_events: 1,
          adhkar_flow_progress: 1,
          app_preferences: 1,
        },
      })
      await expect(createBackupRepository(target.database).readSnapshot()).resolves.toEqual(
        snapshot,
      )
    } finally {
      source.connection.close()
      target.connection.close()
      rmSync(source.directory, { recursive: true, force: true })
      rmSync(target.directory, { recursive: true, force: true })
    }
  })

  it('round trips a snapshot through the versioned backup envelope', async () => {
    const source = await migratedDatabase()
    try {
      await seed(source.database, rows)
      const snapshot = await createBackupRepository(source.database).readSnapshot()

      expect(parseBackup(serializeBackup(snapshot, '2026-10-18T10:00:00.000Z'))).toEqual({
        ok: true,
        value: validBackup(snapshot),
      })
    } finally {
      source.connection.close()
      rmSync(source.directory, { recursive: true, force: true })
    }
  })

  it('adds missing rows while preserving device preferences and onboarding', async () => {
    const target = await migratedDatabase()
    try {
      const deviceRows: BackupRows = {
        ...rows,
        onboarding_state: [{ ...rows.onboarding_state[0], selected_level_id: 'level-2' }],
        qada_events: [
          ...rows.qada_events,
          { id: 'qada-device', prayer_id: 'isha', delta: 2, at: 1_760_000_000_001 },
        ],
        app_preferences: [{ ...rows.app_preferences[0], value: 'light' }],
      }
      await seed(target.database, deviceRows)
      const backupRows: BackupRows = {
        ...rows,
        qada_events: [{ id: 'qada-new', prayer_id: 'fajr', delta: 1, at: 1_760_000_000_002 }],
      }
      const result = await createBackupRepository(target.database).restore(validBackup(backupRows))

      expect(result).toEqual({
        ok: true,
        value: {
          onboarding_state: 0,
          wird_versions: 0,
          wird_entries: 0,
          qada_events: 1,
          adhkar_flow_progress: 0,
          app_preferences: 0,
        },
      })
      await expect(createBackupRepository(target.database).readSnapshot()).resolves.toEqual({
        ...deviceRows,
        qada_events: [...deviceRows.qada_events, backupRows.qada_events[0]],
      })
    } finally {
      target.connection.close()
      rmSync(target.directory, { recursive: true, force: true })
    }
  })

  it('adds nothing when restoring the same backup twice', async () => {
    const target = await migratedDatabase()
    try {
      const repository = createBackupRepository(target.database)
      const backup = validBackup(rows)

      await expect(repository.restore(backup)).resolves.toMatchObject({ ok: true })
      await expect(repository.restore(backup)).resolves.toEqual({
        ok: true,
        value: {
          onboarding_state: 0,
          wird_versions: 0,
          wird_entries: 0,
          qada_events: 0,
          adhkar_flow_progress: 0,
          app_preferences: 0,
        },
      })
    } finally {
      target.connection.close()
      rmSync(target.directory, { recursive: true, force: true })
    }
  })

  it('rolls back every table when an append-only row conflicts', async () => {
    const target = await migratedDatabase()
    try {
      await seed(target.database, {
        ...rows,
        wird_versions: [
          { ...rows.wird_versions[0], created_at: rows.wird_versions[0].created_at + 1 },
        ],
      })
      const before = await createBackupRepository(target.database).readSnapshot()
      const result = await createBackupRepository(target.database).restore(validBackup(rows))

      expect(result).toEqual({ ok: false, error: { reason: 'conflict', table: 'wird_versions' } })
      await expect(createBackupRepository(target.database).readSnapshot()).resolves.toEqual(before)
    } finally {
      target.connection.close()
      rmSync(target.directory, { recursive: true, force: true })
    }
  })

  it('rolls back every earlier insert when an insert fails', async () => {
    const target = fresh()
    let insertCount = 0
    try {
      const clean = adapter(target.connection)
      await migrateDatabase(clean)
      const failing = adapter(target.connection, () => ++insertCount === 3)

      await expect(createBackupRepository(failing).restore(validBackup(rows))).resolves.toEqual({
        ok: false,
        error: { reason: 'write_failed' },
      })
      for (const table of [
        'onboarding_state',
        'wird_versions',
        'wird_entries',
        'qada_events',
        'adhkar_flow_progress',
        'app_preferences',
      ]) {
        expect(target.connection.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get()).toEqual({
          count: 0,
        })
      }
    } finally {
      target.connection.close()
      rmSync(target.directory, { recursive: true, force: true })
    }
  })
})
