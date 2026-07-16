import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { WIRD_LEVELS } from '@/content/levels'
import { db } from '@/lib/db/db'

import {
  clearFlowProgress,
  completeLinkedWirdItem,
  readFlowProgress,
  writeFlowProgress,
} from '../db'

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

describe('flow progress (NBD-41)', () => {
  beforeEach(async () => {
    await db.adhkarFlow.clear()
  })

  it('round-trips, overwrites, and clears a flow position', async () => {
    await writeFlowProgress('morning', '2026-07-16', { index: 3, count: 2, finished: false })
    expect(await readFlowProgress('morning')).toMatchObject({
      categoryId: 'morning',
      day: '2026-07-16',
      index: 3,
      count: 2,
      finished: false,
    })

    await writeFlowProgress('morning', '2026-07-16', { index: 4, count: 0, finished: false })
    expect((await readFlowProgress('morning'))?.index).toBe(4)

    await clearFlowProgress('morning')
    expect(await readFlowProgress('morning')).toBeUndefined()
  })

  it('keeps categories independent', async () => {
    await writeFlowProgress('morning', '2026-07-16', { index: 1, count: 0, finished: false })
    await writeFlowProgress('evening', '2026-07-16', { index: 9, count: 5, finished: false })
    expect((await readFlowProgress('morning'))?.index).toBe(1)
    expect((await readFlowProgress('evening'))?.index).toBe(9)
  })
})
