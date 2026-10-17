import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { WIRD_LEVELS } from '@nabd/shared'

import { migrateDatabase, type MigrationDatabase } from '../../db/database'
import type { ProductDatabase, SqlValue } from '../../db/productDatabase'
import { createWirdRepository } from '../db'

const TODAY = '2026-10-18'
const TOMORROW = '2026-10-19'
const CREATED_AT = 1_000
const VERSION_ID = 'version-current'

const changedLevelDefinition = {
  ...WIRD_LEVELS[0].wird,
  items: WIRD_LEVELS[0].wird.items.map((item, index) =>
    index === 0 ? { ...item, label: `${item.label} changed` } : item,
  ),
}

const customDefinition = {
  areas: [{ id: 'custom-area', label: 'ورد مخصص', order: 0 }],
  items: [{ id: 'custom-item', areaId: 'custom-area', label: 'دعاء', kind: 'checkbox' as const }],
}

function createAdapter(
  database: DatabaseSync,
  failInsert = false,
): ProductDatabase & MigrationDatabase {
  let transactionTail = Promise.resolve()
  const value: ProductDatabase & MigrationDatabase = {
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
      if (failInsert && sql.includes('INSERT INTO wird_versions')) {
        throw new Error('injected SQLite failure')
      }
      return database.prepare(sql).run(...parameters)
    },
    async withExclusiveTransactionAsync(task: (transaction: ProductDatabase) => Promise<void>) {
      const run = transactionTail.then(async () => {
        database.exec('BEGIN EXCLUSIVE')
        try {
          await task(value)
          database.exec('COMMIT')
        } catch (error) {
          database.exec('ROLLBACK')
          throw error
        }
      })
      transactionTail = run.catch(() => undefined)
      return run
    },
  }
  return value
}

function fresh() {
  const directory = mkdtempSync(join(tmpdir(), 'nabd-wird-healing-'))
  const connection = new DatabaseSync(join(directory, 'nabd.db'))
  return { directory, connection }
}

async function migrate(connection: DatabaseSync) {
  const database = createAdapter(connection)
  await migrateDatabase(database as MigrationDatabase)
  return database
}

function insertVersion(
  connection: DatabaseSync,
  id: string,
  effectiveFrom: string,
  definition: object,
  createdAt: number,
) {
  connection
    .prepare(
      'INSERT INTO wird_versions (id, effective_from, definition_json, created_at) VALUES (?, ?, ?, ?)',
    )
    .run(id, effectiveFrom, JSON.stringify(definition), createdAt)
}

function insertEntry(connection: DatabaseSync, id: string, day: string, versionId: string) {
  connection
    .prepare(
      'INSERT INTO wird_entries (id, day, version_id, item_id, done, at) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .run(id, day, versionId, WIRD_LEVELS[0].wird.items[0].id, 1, CREATED_AT)
}

function versionRows(connection: DatabaseSync) {
  return connection
    .prepare(
      'SELECT id, effective_from, definition_json, created_at FROM wird_versions ORDER BY rowid',
    )
    .all()
}

function entryRows(connection: DatabaseSync) {
  return connection
    .prepare('SELECT id, day, version_id, item_id, done, at FROM wird_entries ORDER BY rowid')
    .all()
}

describe('native wird version healing', () => {
  it('does nothing when the current definition is unchanged', async () => {
    const { directory, connection } = fresh()
    try {
      const database = await migrate(connection)
      insertVersion(connection, VERSION_ID, TODAY, WIRD_LEVELS[0].wird, CREATED_AT)

      await expect(
        createWirdRepository(database).healVersionFromLevels({
          today: TODAY,
          createdAt: CREATED_AT + 1,
        }),
      ).resolves.toEqual({ created: false, effectiveFrom: null })
      expect(versionRows(connection)).toHaveLength(1)
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('creates a changed level definition effective today when today has no entries', async () => {
    const { directory, connection } = fresh()
    try {
      const database = await migrate(connection)
      insertVersion(connection, VERSION_ID, TODAY, changedLevelDefinition, CREATED_AT)

      await expect(
        createWirdRepository(database).healVersionFromLevels({
          today: TODAY,
          createdAt: CREATED_AT + 1,
        }),
      ).resolves.toEqual({ created: true, effectiveFrom: TODAY })
      expect(versionRows(connection)).toHaveLength(2)
      expect(versionRows(connection)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            effective_from: TODAY,
            definition_json: JSON.stringify(WIRD_LEVELS[0].wird),
            created_at: CREATED_AT + 1,
          }),
        ]),
      )
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('creates a changed level definition effective tomorrow when today has entries', async () => {
    const { directory, connection } = fresh()
    try {
      const database = await migrate(connection)
      insertVersion(connection, VERSION_ID, TODAY, changedLevelDefinition, CREATED_AT)
      insertEntry(connection, 'entry-today', TODAY, VERSION_ID)

      await expect(
        createWirdRepository(database).healVersionFromLevels({
          today: TODAY,
          createdAt: CREATED_AT + 1,
        }),
      ).resolves.toEqual({ created: true, effectiveFrom: TOMORROW })
      expect(versionRows(connection)).toEqual(
        expect.arrayContaining([expect.objectContaining({ effective_from: TOMORROW })]),
      )
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('does nothing for a custom definition with no matching level', async () => {
    const { directory, connection } = fresh()
    try {
      const database = await migrate(connection)
      insertVersion(connection, VERSION_ID, TODAY, customDefinition, CREATED_AT)

      await expect(
        createWirdRepository(database).healVersionFromLevels({
          today: TODAY,
          createdAt: CREATED_AT + 1,
        }),
      ).resolves.toEqual({ created: false, effectiveFrom: null })
      expect(versionRows(connection)).toHaveLength(1)
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('preserves historical entries and old versions byte-for-byte', async () => {
    const { directory, connection } = fresh()
    try {
      const database = await migrate(connection)
      insertVersion(connection, VERSION_ID, '2026-10-17', changedLevelDefinition, CREATED_AT)
      insertEntry(connection, 'entry-history', '2026-10-17', VERSION_ID)
      const oldVersions = versionRows(connection)
      const oldEntries = entryRows(connection)

      await expect(
        createWirdRepository(database).healVersionFromLevels({
          today: TODAY,
          createdAt: CREATED_AT + 1,
        }),
      ).resolves.toEqual({ created: true, effectiveFrom: TODAY })

      expect(versionRows(connection)).toEqual([...oldVersions, expect.anything()])
      expect(versionRows(connection)[0]).toEqual(oldVersions[0])
      expect(entryRows(connection)).toEqual(oldEntries)
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('creates exactly one version for two concurrent healing calls', async () => {
    const { directory, connection } = fresh()
    try {
      const database = await migrate(connection)
      insertVersion(connection, VERSION_ID, TODAY, changedLevelDefinition, CREATED_AT)
      const repository = createWirdRepository(database)

      const results = await Promise.all([
        repository.healVersionFromLevels({ today: TODAY, createdAt: CREATED_AT + 1 }),
        repository.healVersionFromLevels({ today: TODAY, createdAt: CREATED_AT + 2 }),
      ])

      expect(results.filter((result) => result.created)).toHaveLength(1)
      expect(versionRows(connection)).toHaveLength(2)
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('creates nothing when healing is retried after close and reopen', async () => {
    const { directory, connection } = fresh()
    try {
      const database = await migrate(connection)
      insertVersion(connection, VERSION_ID, TODAY, changedLevelDefinition, CREATED_AT)
      const repository = createWirdRepository(database)
      await expect(
        repository.healVersionFromLevels({ today: TODAY, createdAt: CREATED_AT + 1 }),
      ).resolves.toEqual({ created: true, effectiveFrom: TODAY })
      connection.close()

      const reopenedConnection = new DatabaseSync(join(directory, 'nabd.db'))
      try {
        const reopenedDatabase = await migrate(reopenedConnection)
        await expect(
          createWirdRepository(reopenedDatabase).healVersionFromLevels({
            today: TODAY,
            createdAt: CREATED_AT + 2,
          }),
        ).resolves.toEqual({ created: false, effectiveFrom: null })
        expect(versionRows(reopenedConnection)).toHaveLength(2)
      } finally {
        reopenedConnection.close()
      }
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('rolls back an injected insert failure without a partial row', async () => {
    const { directory, connection } = fresh()
    try {
      const database = await migrate(connection)
      insertVersion(connection, VERSION_ID, TODAY, changedLevelDefinition, CREATED_AT)
      const failingDatabase = createAdapter(connection, true)

      await expect(
        createWirdRepository(failingDatabase).healVersionFromLevels({
          today: TODAY,
          createdAt: CREATED_AT + 1,
        }),
      ).rejects.toThrow('injected SQLite failure')
      expect(versionRows(connection)).toHaveLength(1)
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
