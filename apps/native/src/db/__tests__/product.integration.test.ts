import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import {
  assertRepositoryCharacterization,
  seedRepositoryCharacterization,
} from '@nabd/shared/testing'

import { createDhikrCompletionRepository } from '../../counter/db'
import { migrateDatabase, type MigrationDatabase } from '../database'
import type { ProductDatabase, SqlValue } from '../productDatabase'
import { createCanonicalOnboardingRepository } from '../../onboarding/canonicalDb'
import { createQadaRepository } from '../../qada/db'
import { createWirdRepository } from '../../wird/db'

function adapter(
  database: DatabaseSync,
  failInsert?: () => boolean,
): ProductDatabase & MigrationDatabase {
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
    async withExclusiveTransactionAsync(task: (transaction: ProductDatabase) => Promise<void>) {
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
  const directory = mkdtempSync(join(tmpdir(), 'nabd-product-'))
  const connection = new DatabaseSync(join(directory, 'nabd.db'))
  return { directory, connection }
}

describe('native product SQLite repositories', () => {
  it('runs the shared characterization fixture against SQLite', async () => {
    const { directory, connection } = fresh()
    try {
      const db = adapter(connection)
      await migrateDatabase(db as MigrationDatabase)
      const repositories = {
        wird: createWirdRepository(db),
        qada: createQadaRepository(db),
        dhikrCompletion: createDhikrCompletionRepository(db),
        onboarding: createCanonicalOnboardingRepository(db),
      }
      const seeded = await seedRepositoryCharacterization(repositories)
      await assertRepositoryCharacterization(repositories, seeded)
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })

  it('rolls back all qada debt events when the third insert fails', async () => {
    const { directory, connection } = fresh()
    let inserts = 0
    try {
      const clean = adapter(connection)
      await migrateDatabase(clean as MigrationDatabase)
      const failing = adapter(connection, () => ++inserts === 3)
      await expect(createQadaRepository(failing).addQadaDebt(2, 1)).resolves.toEqual({
        ok: false,
        error: 'add_debt_failed',
      })
      expect(connection.prepare('SELECT COUNT(*) AS count FROM qada_events').get()).toEqual({
        count: 0,
      })
    } finally {
      connection.close()
      rmSync(directory, { recursive: true, force: true })
    }
  })
})
