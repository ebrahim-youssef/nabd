import 'fake-indexeddb/auto'

import { describe, expect, it } from 'vitest'

import { db } from './db'

const EXPECTED_STORES = ['adhkarFlow', 'qadaEvents', 'wirdEntries', 'wirdVersions']
const EXPECTED_SCHEMA = {
  adhkarFlow: { primaryKey: 'categoryId', indexes: [] },
  qadaEvents: { primaryKey: 'id', indexes: ['prayerId'] },
  wirdEntries: { primaryKey: 'id', indexes: ['[day+itemId]', 'at', 'day', 'versionId'] },
  wirdVersions: { primaryKey: 'id', indexes: ['createdAt', 'effectiveFrom'] },
}

describe('SPA database schema', () => {
  it('contains only the local persistence stores', () => {
    expect(db.tables.map((table) => table.name).sort()).toEqual(EXPECTED_STORES)
  })

  it('uses the persistence contract primary keys and indexes', () => {
    const schema = Object.fromEntries(
      db.tables.map((table) => [
        table.name,
        {
          primaryKey: table.schema.primKey.name,
          indexes: table.schema.indexes.map((index) => index.name).sort(),
        },
      ]),
    )

    expect(schema).toEqual(EXPECTED_SCHEMA)
  })
})
