import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { WIRD_LEVELS } from '@/content/levels'
import { db } from '@/lib/db/db'

import { completeLinkedWirdItem } from '../db'

beforeEach(async () => {
  await Promise.all([db.wirdVersions.clear(), db.wirdEntries.clear(), db.outbox.clear()])
})

describe('completeLinkedWirdItem', () => {
  it('appends a done entry stamped with the version in force, queued for sync', async () => {
    await db.wirdVersions.add({
      id: 'v1',
      effectiveFrom: '2026-07-01',
      definition: WIRD_LEVELS[0].wird,
      createdAt: 1,
    })

    const result = await completeLinkedWirdItem('2026-07-16', 'morning-adhkar', 1000)

    expect(result.ok && result.value).toMatchObject({
      itemId: 'morning-adhkar',
      versionId: 'v1',
      done: true,
    })
    expect(await db.wirdEntries.count()).toBe(1)
    expect(await db.outbox.count()).toBe(1)
  })

  it('is a no-op without a wird or without the linked item', async () => {
    const noWird = await completeLinkedWirdItem('2026-07-16', 'morning-adhkar', 1000)
    expect(noWird.ok && noWird.value).toBeNull()

    await db.wirdVersions.add({
      id: 'v1',
      effectiveFrom: '2026-07-01',
      definition: { areas: [], items: [] },
      createdAt: 1,
    })
    const noItem = await completeLinkedWirdItem('2026-07-16', 'morning-adhkar', 2000)
    expect(noItem.ok && noItem.value).toBeNull()
    expect(await db.wirdEntries.count()).toBe(0)
  })
})
