import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { WIRD_LEVELS } from '@/content/levels'
import { db } from '@/lib/db/db'

import { countWirdVersions, seedWirdFromLevel } from '../db'

const LEVEL_1 = WIRD_LEVELS[0]

beforeEach(async () => {
  await Promise.all([db.wirdVersions.clear(), db.outbox.clear()])
})

describe('seedWirdFromLevel', () => {
  it('creates version 1 from the level and queues it for sync atomically', async () => {
    const result = await seedWirdFromLevel(LEVEL_1.wird, '2026-07-15', 1000)

    expect(result.ok && result.value?.effectiveFrom).toBe('2026-07-15')
    expect(await countWirdVersions()).toBe(1)
    const outbox = await db.outbox.toArray()
    expect(outbox).toHaveLength(1)
    expect(outbox[0]).toMatchObject({ table: 'wirdVersions', createdAt: 1000 })
  })

  it('is a no-op when a version already exists (double-submit safe)', async () => {
    await seedWirdFromLevel(LEVEL_1.wird, '2026-07-15', 1000)
    const second = await seedWirdFromLevel(LEVEL_1.wird, '2026-07-16', 2000)

    expect(second.ok && second.value).toBeNull()
    expect(await countWirdVersions()).toBe(1)
    expect(await db.outbox.count()).toBe(1)
  })
})
