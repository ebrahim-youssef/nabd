import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { WIRD_LEVELS } from '@/content/levels'
import { db } from '@/lib/db/db'

import { addVersion, appendEntry, getDayEntries, listVersions, setWirdLevel } from '../db'
import { versionInForce } from '../logic'

const WIRD_FIXTURE = WIRD_LEVELS[0].wird
const LEVEL_2_FIXTURE = WIRD_LEVELS[1].wird
const LEVEL_3_FIXTURE = WIRD_LEVELS[2].wird

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
    const result = await addVersion('2026-07-14', WIRD_FIXTURE, 1000)
    expect(result.ok).toBe(true)

    expect(await listVersions()).toHaveLength(1)
    const outbox = await db.outbox.toArray()
    expect(outbox).toHaveLength(1)
    expect(outbox[0]).toMatchObject({ table: 'wirdVersions', createdAt: 1000 })
  })
})

describe('setWirdLevel', () => {
  it('writes a version with effectiveFrom === nextDay(today)', async () => {
    await addVersion('2026-07-14', WIRD_FIXTURE, 1000)
    const res = await setWirdLevel(LEVEL_2_FIXTURE, '2026-07-14', 2000)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.value?.effectiveFrom).toBe('2026-07-15')
    }

    const versions = await listVersions()
    expect(versions).toHaveLength(2)
    // Today's version remains level 1
    expect(versionInForce(versions, '2026-07-14')?.definition).toEqual(WIRD_FIXTURE)
    // Tomorrow's version is level 2
    expect(versionInForce(versions, '2026-07-15')?.definition).toEqual(LEVEL_2_FIXTURE)
  })

  it('is a no-op when chosen level equals level in force tomorrow', async () => {
    await addVersion('2026-07-14', WIRD_FIXTURE, 1000)
    await setWirdLevel(LEVEL_2_FIXTURE, '2026-07-14', 2000)

    const initialVersions = await listVersions()
    expect(initialVersions).toHaveLength(2)

    // Attempting to set LEVEL_2 again for tomorrow is a no-op
    await setWirdLevel(LEVEL_2_FIXTURE, '2026-07-14', 3000)
    const updatedVersions = await listVersions()
    expect(updatedVersions).toHaveLength(2)
  })

  it('tie-breaks multiple choices on the same day by newest createdAt for tomorrow', async () => {
    await addVersion('2026-07-14', WIRD_FIXTURE, 1000)
    // Switch to Level 2
    await setWirdLevel(LEVEL_2_FIXTURE, '2026-07-14', 2000)
    // Switch to Level 3 on same day
    await setWirdLevel(LEVEL_3_FIXTURE, '2026-07-14', 3000)

    const versions = await listVersions()
    expect(versions).toHaveLength(3)
    expect(versionInForce(versions, '2026-07-15')?.definition).toEqual(LEVEL_3_FIXTURE)
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
