import { INITIAL_FLOW } from '@nabd/shared'
import type { ProductDatabase, SqlValue } from '../../db/productDatabase'

import { createAdhkarRepository } from '../db'

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

describe('native adhkar repository', () => {
  it('restores morning progress for the same day and ignores stale rows', async () => {
    const getFirstAsync = jest.fn(async () => ({
      category_id: 'morning',
      day: DAY,
      flow_index: 1,
      count: 2,
      finished: 0,
    }))
    const repository = createAdhkarRepository(
      databaseWithTransaction({ getFirstAsync: getFirstAsync as ProductDatabase['getFirstAsync'] }),
    )

    await expect(repository.readFlowProgress('morning', DAY)).resolves.toEqual({
      categoryId: 'morning',
      day: DAY,
      index: 1,
      count: 2,
      finished: false,
    })
    await expect(repository.readFlowProgress('morning', '2026-09-19')).resolves.toBeUndefined()
  })

  it('never persists repeatable category progress', async () => {
    const database = databaseWithTransaction()
    const repository = createAdhkarRepository(database)

    await repository.writeFlowProgress('sleep', DAY, { ...INITIAL_FLOW, count: 1 })
    await repository.clearFlowProgress('sleep')

    expect(database.runAsync).not.toHaveBeenCalled()
  })

  it('appends one linked completion only when the active version contains it', async () => {
    let entryRows: Array<Record<string, unknown>> = []
    const getAllAsync = jest.fn(async <T>(source: string) => {
      if (source.includes('wird_entries')) return entryRows as T[]
      return [
        {
          id: 'version-1',
          effective_from: DAY,
          definition_json: JSON.stringify({ areas: [], items: [{ id: 'morning-adhkar' }] }),
          created_at: 1,
        },
      ] as T[]
    })
    const getFirstAsync = jest.fn(async () => ({
      id: 'entry-1',
      day: DAY,
      version_id: 'version-1',
      item_id: 'morning-adhkar',
      done: 1,
      at: 10,
    }))
    const repository = createAdhkarRepository(
      databaseWithTransaction({
        getAllAsync: getAllAsync as ProductDatabase['getAllAsync'],
        getFirstAsync: getFirstAsync as ProductDatabase['getFirstAsync'],
      }),
    )

    await expect(repository.completeLinkedWirdItem(DAY, 'morning', 10)).resolves.toMatchObject({
      ok: true,
      value: { itemId: 'morning-adhkar', done: true },
    })

    entryRows = [
      {
        id: 'entry-1',
        day: DAY,
        version_id: 'version-1',
        item_id: 'morning-adhkar',
        done: 1,
        at: 10,
      },
    ]
    await expect(repository.completeLinkedWirdItem(DAY, 'morning', 11)).resolves.toEqual({
      ok: true,
      value: null,
    })
  })
})
