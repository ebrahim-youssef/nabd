import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { WIRD_LEVELS } from '../../content/levels'
import { versionInForce } from '../../lib/wird'
import { buildChecklist } from '../logic'

import { migrateDatabase, type MigrationDatabase } from '../../db/database'
import type { ProductDatabase, SqlValue } from '../../db/productDatabase'
import { createWirdRepository } from '../db'
import { createDhikrCompletionRepository } from '../../counter/db'

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

const changedLevelTwoDefinition = {
  ...WIRD_LEVELS[1].wird,
  items: WIRD_LEVELS[1].wird.items.map((item, index) =>
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
      `INSERT INTO wird_versions
         (id, effective_from, definition_json, created_at)
       VALUES (?, ?, ?, ?)`,
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
        }),
      ).resolves.toEqual({ created: false, effectiveFrom: null })
      expect(versionRows(connection)).toHaveLength(1)
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('creates a changed level effective tomorrow when today has no entries', async () => {
    const { directory, connection } = fresh()
    try {
      const database = await migrate(connection)
      insertVersion(connection, VERSION_ID, TODAY, changedLevelDefinition, CREATED_AT)

      await expect(
        createWirdRepository(database).healVersionFromLevels({
          today: TODAY,
        }),
      ).resolves.toEqual({ created: true, effectiveFrom: TOMORROW })
      expect(versionRows(connection)).toHaveLength(2)
      expect(versionRows(connection)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            effective_from: TOMORROW,
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

  it('lets a later manual level version outrank a healed version', async () => {
    const { directory, connection } = fresh()
    try {
      const database = await migrate(connection)
      insertVersion(connection, VERSION_ID, TODAY, changedLevelDefinition, CREATED_AT)
      const repository = createWirdRepository(database)

      await expect(
        repository.healVersionFromLevels({
          today: TODAY,
        }),
      ).resolves.toEqual({ created: true, effectiveFrom: TOMORROW })
      insertVersion(connection, 'version-manual', TOMORROW, WIRD_LEVELS[1].wird, CREATED_AT + 1_000)

      const versions = await repository.listVersions()
      expect(versionInForce(versions, TOMORROW)?.id).toBe('version-manual')
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

  it('keeps a level scheduled for tomorrow', async () => {
    const { directory, connection } = fresh()
    try {
      const database = await migrate(connection)
      insertVersion(connection, 'version-today', TODAY, WIRD_LEVELS[0].wird, CREATED_AT)
      insertVersion(connection, 'version-scheduled', TOMORROW, WIRD_LEVELS[1].wird, CREATED_AT + 1)

      await expect(
        createWirdRepository(database).healVersionFromLevels({
          today: TODAY,
        }),
      ).resolves.toEqual({ created: false, effectiveFrom: null })
      expect(versionRows(connection)).toHaveLength(2)
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it("heals a stale level scheduled for tomorrow to its own level's new definition", async () => {
    const { directory, connection } = fresh()
    try {
      const database = await migrate(connection)
      insertVersion(connection, 'version-today', TODAY, WIRD_LEVELS[0].wird, CREATED_AT)
      insertVersion(
        connection,
        'version-scheduled',
        TOMORROW,
        changedLevelTwoDefinition,
        CREATED_AT + 1,
      )

      await expect(
        createWirdRepository(database).healVersionFromLevels({
          today: TODAY,
        }),
      ).resolves.toEqual({ created: true, effectiveFrom: TOMORROW })
      expect(versionRows(connection)).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            effective_from: TOMORROW,
            definition_json: JSON.stringify(WIRD_LEVELS[1].wird),
            created_at: CREATED_AT + 2,
          }),
        ]),
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
        }),
      ).resolves.toEqual({ created: true, effectiveFrom: TOMORROW })

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
        repository.healVersionFromLevels({ today: TODAY }),
        repository.healVersionFromLevels({ today: TODAY }),
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
      await expect(repository.healVersionFromLevels({ today: TODAY })).resolves.toEqual({
        created: true,
        effectiveFrom: TOMORROW,
      })
      connection.close()

      const reopenedConnection = new DatabaseSync(join(directory, 'nabd.db'))
      try {
        const reopenedDatabase = await migrate(reopenedConnection)
        await expect(
          createWirdRepository(reopenedDatabase).healVersionFromLevels({
            today: TODAY,
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
        }),
      ).rejects.toThrow('injected SQLite failure')
      expect(versionRows(connection)).toHaveLength(1)
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })
})

describe('native wird set-state writes', () => {
  it('returns the newest stale action strictly after the seen-at timestamp', async () => {
    const { directory, connection } = fresh()
    try {
      const database = await migrate(connection)
      insertVersion(connection, VERSION_ID, TODAY, WIRD_LEVELS[0].wird, CREATED_AT)
      const repository = createWirdRepository(database)
      const itemId = WIRD_LEVELS[0].wird.items[0].id

      await repository.setItemState({
        actionId: 'stale-old',
        day: TODAY,
        versionId: 'old-version',
        itemId,
        done: true,
        at: CREATED_AT,
      })
      await repository.setItemState({
        actionId: 'stale-middle',
        day: TODAY,
        versionId: 'old-version',
        itemId,
        done: true,
        at: CREATED_AT + 1,
      })
      await repository.setItemState({
        actionId: 'stale-new',
        day: TOMORROW,
        versionId: 'old-version',
        itemId,
        done: true,
        at: CREATED_AT + 10,
      })

      await expect(repository.readLatestStaleAction(CREATED_AT)).resolves.toEqual({
        day: TOMORROW,
        at: CREATED_AT + 10,
      })
      await expect(repository.readLatestStaleAction(CREATED_AT + 1)).resolves.toEqual({
        day: TOMORROW,
        at: CREATED_AT + 10,
      })
      await expect(repository.readLatestStaleAction(CREATED_AT + 10)).resolves.toBeNull()
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('appends only state changes and deduplicates action ids across reopen', async () => {
    const { directory, connection } = fresh()
    let connectionClosed = false
    try {
      const database = await migrate(connection)
      const definition = WIRD_LEVELS[0].wird
      insertVersion(connection, VERSION_ID, TODAY, definition, CREATED_AT)
      const repository = createWirdRepository(database)
      const itemId = definition.items[0].id
      const input = { day: TODAY, versionId: VERSION_ID, itemId, done: true, at: CREATED_AT }

      await expect(repository.setItemState(input)).resolves.toMatchObject({
        ok: true,
        value: { outcome: 'applied', entry: { done: true } },
      })
      await expect(
        repository.setItemState({ ...input, at: CREATED_AT + 1 }),
      ).resolves.toMatchObject({
        ok: true,
        value: { outcome: 'unchanged', entry: null },
      })
      await expect(
        repository.setItemState({
          ...input,
          actionId: 'action-unchanged',
          at: CREATED_AT + 2,
        }),
      ).resolves.toMatchObject({ ok: true, value: { outcome: 'unchanged', entry: null } })
      await expect(
        repository.setItemState({
          ...input,
          actionId: 'action-1',
          done: false,
          at: CREATED_AT + 3,
        }),
      ).resolves.toMatchObject({ ok: true, value: { outcome: 'applied' } })
      await expect(
        repository.setItemState({ ...input, actionId: 'action-1', done: true, at: CREATED_AT + 4 }),
      ).resolves.toMatchObject({ ok: true, value: { outcome: 'duplicate', entry: null } })
      expect(entryRows(connection)).toHaveLength(2)
      expect(entryRows(connection)).toEqual([
        expect.objectContaining({ done: 1 }),
        expect.objectContaining({ done: 0 }),
      ])

      connection.close()
      connectionClosed = true
      const reopened = new DatabaseSync(join(directory, 'nabd.db'))
      try {
        const reopenedRepository = createWirdRepository(await migrate(reopened))
        await expect(
          reopenedRepository.setItemState({ ...input, actionId: 'action-1', at: CREATED_AT + 4 }),
        ).resolves.toMatchObject({ ok: true, value: { outcome: 'duplicate' } })
        expect(entryRows(reopened)).toHaveLength(2)
        expect(
          reopened.prepare('SELECT action_id, outcome FROM wird_actions ORDER BY action_id').all(),
        ).toEqual([
          { action_id: 'action-1', outcome: 'applied' },
          { action_id: 'action-unchanged', outcome: 'unchanged' },
        ])
      } finally {
        reopened.close()
      }
    } finally {
      if (!connectionClosed) connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('records stale action outcomes without writing entries', async () => {
    const { directory, connection } = fresh()
    try {
      const database = await migrate(connection)
      insertVersion(connection, VERSION_ID, TODAY, WIRD_LEVELS[0].wird, CREATED_AT)
      const repository = createWirdRepository(database)

      await expect(
        repository.setItemState({
          actionId: 'stale-action',
          day: TODAY,
          versionId: 'wrong-version',
          itemId: WIRD_LEVELS[0].wird.items[0].id,
          done: true,
          at: CREATED_AT,
        }),
      ).resolves.toMatchObject({ ok: true, value: { outcome: 'stale', entry: null } })
      expect(entryRows(connection)).toHaveLength(0)
      expect(
        connection
          .prepare('SELECT outcome FROM wird_actions WHERE action_id = ?')
          .get('stale-action'),
      ).toEqual({ outcome: 'stale' })
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('rejects missing items and days without an effective version', async () => {
    const { directory, connection } = fresh()
    try {
      const database = await migrate(connection)
      insertVersion(connection, VERSION_ID, TODAY, WIRD_LEVELS[0].wird, CREATED_AT)
      const repository = createWirdRepository(database)
      const base = { versionId: VERSION_ID, done: true, at: CREATED_AT }

      await expect(
        repository.setItemState({ ...base, day: TODAY, itemId: 'missing-item' }),
      ).resolves.toMatchObject({ ok: true, value: { outcome: 'stale' } })
      await expect(
        repository.setItemState({
          ...base,
          day: '2026-10-17',
          itemId: WIRD_LEVELS[0].wird.items[0].id,
        }),
      ).resolves.toMatchObject({ ok: true, value: { outcome: 'stale' } })
      expect(entryRows(connection)).toHaveLength(0)
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('keeps one done state when counter and checklist both complete an item', async () => {
    const { directory, connection } = fresh()
    try {
      const database = await migrate(connection)
      const definition = WIRD_LEVELS[0].wird
      const item = definition.items.find(({ kind }) => kind === 'counter')
      if (!item) throw new Error('test definition has no counter item')
      insertVersion(connection, VERSION_ID, TODAY, definition, CREATED_AT)

      await expect(
        createDhikrCompletionRepository(database).completeDhikr(
          TODAY,
          VERSION_ID,
          item.id,
          CREATED_AT,
        ),
      ).resolves.toMatchObject({ ok: true, value: { done: true } })
      await expect(
        createWirdRepository(database).setItemState({
          day: TODAY,
          versionId: VERSION_ID,
          itemId: item.id,
          done: true,
          at: CREATED_AT + 1,
        }),
      ).resolves.toMatchObject({ ok: true, value: { outcome: 'unchanged', entry: null } })
      expect(entryRows(connection)).toHaveLength(1)
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('uses the last inserted tie in writes and checklist projection', async () => {
    const { directory, connection } = fresh()
    try {
      const database = await migrate(connection)
      const definition = WIRD_LEVELS[0].wird
      const item = definition.items[0]
      insertVersion(connection, VERSION_ID, TODAY, definition, CREATED_AT)
      const repository = createWirdRepository(database)
      const setItemState = (done: boolean) =>
        repository.setItemState({
          day: TODAY,
          versionId: VERSION_ID,
          itemId: item.id,
          done,
          at: CREATED_AT,
        })

      await expect(setItemState(true)).resolves.toMatchObject({
        ok: true,
        value: { outcome: 'applied' },
      })
      await expect(setItemState(false)).resolves.toMatchObject({
        ok: true,
        value: { outcome: 'applied' },
      })
      const nextOutcome = await setItemState(false)
      const dayEntries = await repository.getDayEntries(TODAY)
      const checklistItem = buildChecklist(definition, dayEntries, TODAY)
        .flatMap((area) => area.items)
        .find(({ id }) => id === item.id)

      expect(nextOutcome).toMatchObject({ ok: true, value: { outcome: 'unchanged' } })
      expect(checklistItem?.done).toBe(false)
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
