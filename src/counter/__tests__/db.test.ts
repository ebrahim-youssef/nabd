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
  it.each([
    ['the active version omits the item', true],
    ['the day has no version in force', false],
  ])('treats linked completion as a no-op when %s', async (_case, hasVersion) => {
    const getAllAsync = jest.fn(async <T>() =>
      hasVersion
        ? ([
            {
              id: 'version-1',
              effective_from: DAY,
              definition_json: JSON.stringify({ areas: [], items: [] }),
              created_at: 1,
            },
          ] as T[])
        : [],
    )
    const getFirstAsync = jest.fn(
      async <T>(_source: string, ..._parameters: SqlValue[]) => null as T | null,
    )
    const database = databaseWithTransaction({
      getAllAsync: getAllAsync as ProductDatabase['getAllAsync'],
      getFirstAsync: getFirstAsync as ProductDatabase['getFirstAsync'],
    })
    const repository = createDhikrCompletionRepository(database)

    await expect(repository.completeLinkedWirdItem(DAY, 'istighfar', 10)).resolves.toEqual({
      ok: true,
      value: null,
    })
    expect(getFirstAsync).not.toHaveBeenCalled()
    expect(database.runAsync).not.toHaveBeenCalled()
  })

  it('completes an explicit daily item idempotently in one exclusive transaction', async () => {
    let entryRows: Array<Record<string, unknown>> = []
    const getAllAsync = jest.fn(async <T>(source: string) => {
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
    const getFirstAsync = jest.fn(async (source: string) => {
      if (source.startsWith('INSERT INTO wird_entries')) {
        return {
          id: 'entry-1',
          day: DAY,
          version_id: 'version-1',
          item_id: 'istighfar',
          done: 1,
          at: 10,
        }
      }
      return entryRows.length > 0 ? { done: 1 } : null
    })
    const database = databaseWithTransaction({
      getAllAsync: getAllAsync as ProductDatabase['getAllAsync'],
      getFirstAsync: getFirstAsync as ProductDatabase['getFirstAsync'],
    })
    const repository = createDhikrCompletionRepository(database)

    await expect(repository.completeLinkedWirdItem(DAY, 'istighfar', 10)).resolves.toMatchObject({
      ok: true,
      value: { itemId: 'istighfar', done: true },
    })
    expect(database.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1)
    expect(getAllAsync).toHaveBeenCalledTimes(1)
    expect(getAllAsync).toHaveBeenCalledWith(expect.stringContaining('wird_versions'))

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
    expect(
      getFirstAsync.mock.calls.filter(([source]) => source.startsWith('INSERT INTO wird_entries')),
    ).toHaveLength(1)
  })
})
