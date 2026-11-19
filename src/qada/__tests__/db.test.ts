import { DatabaseSync } from 'node:sqlite'
import type { ProductDatabase, SqlValue } from '../../db/productDatabase'
import { createQadaRepository, restoreQadaPrayer } from '../db'

it('reports a restore failure when the ledger write fails', async () => {
  const database = {
    runAsync: jest.fn().mockRejectedValue(new Error('write failed')),
  } as unknown as ProductDatabase
  await expect(restoreQadaPrayer(database, 'fajr', 1)).resolves.toEqual({
    ok: false,
    error: 'restore_failed',
  })
})

it('prevents payments beyond the remaining debt and restores only the selected prayer', async () => {
  const connection = new DatabaseSync(':memory:')
  connection.exec('CREATE TABLE qada_events (id TEXT, prayer_id TEXT, delta INTEGER, at INTEGER)')
  const database = {
    async runAsync(sql: string, ...parameters: SqlValue[]) {
      return connection.prepare(sql).run(...parameters)
    },
    async getAllAsync<T>(sql: string, ...parameters: SqlValue[]) {
      return connection.prepare(sql).all(...parameters) as T[]
    },
    async withExclusiveTransactionAsync(task: (transaction: ProductDatabase) => Promise<void>) {
      await task(database as ProductDatabase)
    },
  } as ProductDatabase
  try {
    const repository = createQadaRepository(database)
    await repository.addQadaDebt(1, 1)
    expect((await repository.payQadaPrayer('fajr', 2)).ok).toBe(true)
    expect((await repository.payQadaPrayer('fajr', 3)).ok).toBe(false)
    expect((await restoreQadaPrayer(database, 'fajr', 4)).ok).toBe(true)
    const events = await repository.listQadaEvents()
    expect(events.filter((event) => event.prayerId === 'fajr').map((event) => event.delta)).toEqual(
      [1, -1, 1],
    )
    expect(
      events.filter((event) => event.prayerId === 'dhuhr').map((event) => event.delta),
    ).toEqual([1])
  } finally {
    connection.close()
  }
})
