import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { db } from '@/lib/db/db'

import { completeDhikr } from '../db'

beforeEach(async () => {
  await Promise.all([db.wirdEntries.clear(), db.outbox.clear()])
})

describe('completeDhikr', () => {
  it('writes a done entry for the linked item and queues it for sync', async () => {
    const result = await completeDhikr('2026-07-14', 'v1', 'tasbih', 500)
    expect(result.ok).toBe(true)

    const entries = await db.wirdEntries.where('day').equals('2026-07-14').toArray()
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({ itemId: 'tasbih', versionId: 'v1', done: true, at: 500 })

    const outbox = await db.outbox.toArray()
    expect(outbox).toHaveLength(1)
    expect(outbox[0]).toMatchObject({ table: 'wirdEntries', rowId: entries[0].id })
  })
})
