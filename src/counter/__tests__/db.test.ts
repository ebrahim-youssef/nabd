import type { ProductDatabase, SqlValue } from '../../db/productDatabase'

import { createDhikrCompletionRepository } from '../db'

const DAY = '2026-09-20'

function databaseWithTransaction(overrides: Partial<ProductDatabase> = {}): ProductDatabase {
  const database = {} as ProductDatabase
  Object.assign(database, {
    execAsync: jest.fn(async () => undefined),
    getFirstAsync: jest.fn(
      async <T>(_source: string, ..._parameters: SqlValue[]) => null as T | null,
    ),
    getAllAsync: jest.fn(async <T>(_source: string, ..._parameters: SqlValue[]) => [] as T[]),
    runAsync: jest.fn(async () => undefined),
    withExclusiveTransactionAsync: jest.fn(
      async (task: (transaction: ProductDatabase) => Promise<void>) => task(database),
    ),
    ...overrides,
  })
  return database
}

describe('native dhikr completion repository', () => {
  it('completes an explicit daily item idempotently in one exclusive transaction', async () => {
    let entryRows: Array<Record<string, unknown>> = []
    const getAllAsync = jest.fn(async <T>(source: string) => {
      if (source.includes('wird_entries')) return entryRows as T[]
      return [
        {
          id: 'version-1',
          effective_from: DAY,
          definition_json: JSON.stringify({
            areas: [],
            items: [{ id: 'istighfar', kind: 'counter', target: 10 }],
          }),
          created_at: 1,
        },
      ] as T[]
    })
    const database = databaseWithTransaction({
      getAllAsync: getAllAsync as ProductDatabase['getAllAsync'],
      getFirstAsync: jest.fn(async () => ({
        id: 'entry-1',
        day: DAY,
        version_id: 'version-1',
        item_id: 'istighfar',
        done: 1,
        at: 10,
      })) as ProductDatabase['getFirstAsync'],
    })
    const repository = createDhikrCompletionRepository(database)

    await expect(repository.completeLinkedWirdItem(DAY, 'istighfar', 10)).resolves.toMatchObject({
      ok: true,
      value: { itemId: 'istighfar', done: true },
    })
    expect(database.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1)
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining('wird_entries'),
      DAY,
      'istighfar',
    )

    entryRows = [
      {
        id: 'entry-1',
        day: DAY,
        version_id: 'version-1',
        item_id: 'istighfar',
        done: 1,
        at: 10,
      },
    ]
    await expect(repository.completeLinkedWirdItem(DAY, 'istighfar', 11)).resolves.toEqual({
      ok: true,
      value: null,
    })
    expect(database.withExclusiveTransactionAsync).toHaveBeenCalledTimes(2)
  })
})
