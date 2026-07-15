import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { DEFAULT_WIRD } from '@/content/default_wird'
import { db } from '@/lib/db/db'

import { addVersion, appendEntry, getDayEntries, listVersions, seedVersionIfEmpty } from '../db'

beforeEach(async () => {
  await Promise.all([
    db.wirdVersions.clear(),
    db.wirdEntries.clear(),
    db.outbox.clear(),
    db.syncMeta.clear(),
  ])
})

describe('addVersion', () => {
  it('stores the version and queues it in the outbox atomically', async () => {
    const result = await addVersion('2026-07-14', DEFAULT_WIRD, 1000)
    expect(result.ok).toBe(true)

    expect(await listVersions()).toHaveLength(1)
    const outbox = await db.outbox.toArray()
    expect(outbox).toHaveLength(1)
    expect(outbox[0]).toMatchObject({ table: 'wirdVersions', createdAt: 1000 })
  })
})

describe('seedVersionIfEmpty', () => {
  it('seeds a version when the store is empty', async () => {
    const result = await seedVersionIfEmpty('2026-07-14', DEFAULT_WIRD, 1000)
    expect(result.ok && result.value?.effectiveFrom).toBe('2026-07-14')
    expect(await db.wirdVersions.count()).toBe(1)
  })

  it('is a no-op when a version already exists', async () => {
    await addVersion('2026-07-01', DEFAULT_WIRD, 500)
    const result = await seedVersionIfEmpty('2026-07-14', DEFAULT_WIRD, 1000)
    expect(result.ok && result.value).toBeNull()
    expect(await db.wirdVersions.count()).toBe(1)
  })
})

describe('appendEntry', () => {
  it('appends check then uncheck as two separate rows (append-only)', async () => {
    await appendEntry('2026-07-14', 'v1', 'fajr', true, 100)
    await appendEntry('2026-07-14', 'v1', 'fajr', false, 200)

    const entries = await getDayEntries('2026-07-14')
    expect(entries).toHaveLength(2)
    const entryOutbox = (await db.outbox.toArray()).filter((row) => row.table === 'wirdEntries')
    expect(entryOutbox).toHaveLength(2)
  })

  it('scopes getDayEntries to the requested day', async () => {
    await appendEntry('2026-07-14', 'v1', 'fajr', true, 100)
    await appendEntry('2026-07-15', 'v1', 'fajr', true, 100)
    expect(await getDayEntries('2026-07-14')).toHaveLength(1)
  })
})
