import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/lib/db/db'
import type { WirdEntry, WirdVersion } from '@/types/wird'

import { getEntriesInRange, getVersions } from '../db'

const version: WirdVersion = {
  id: 'v1',
  effectiveFrom: '2026-07-01',
  definition: { areas: [], items: [] },
  createdAt: 1,
}

function entry(day: string): WirdEntry {
  return { id: `${day}-fajr`, day, versionId: 'v1', itemId: 'fajr', done: true, at: 1 }
}

beforeEach(async () => {
  await Promise.all([db.wirdVersions.clear(), db.wirdEntries.clear()])
})

describe('getVersions', () => {
  it('returns all stored versions', async () => {
    await db.wirdVersions.add(version)
    expect(await getVersions()).toHaveLength(1)
  })
})

describe('getEntriesInRange', () => {
  it('returns entries within an inclusive day range', async () => {
    await db.wirdEntries.bulkAdd([
      entry('2026-07-05'),
      entry('2026-07-08'),
      entry('2026-07-12'),
      entry('2026-07-20'),
    ])

    const inRange = await getEntriesInRange('2026-07-08', '2026-07-12')
    expect(inRange.map((e) => e.day).sort()).toEqual(['2026-07-08', '2026-07-12'])
  })

  it('returns empty when nothing falls in range', async () => {
    await db.wirdEntries.add(entry('2026-01-01'))
    expect(await getEntriesInRange('2026-07-01', '2026-07-31')).toEqual([])
  })
})
