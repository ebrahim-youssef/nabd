import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '../db/db'
import { addVersion, appendEntry } from '../wird/db'
import { completeDhikr, completeLinkedWirdItem, isWirdItemDoneToday } from './db'
import { WIRD_LEVELS } from '@nabd/shared'

const DAY = '2026-08-12'
const CREATED_AT = 1_755_000_000_000
const COMPLETED_AT = CREATED_AT + 1
const UNCHECKED_AT = COMPLETED_AT + 1

beforeEach(async () => {
  await db.transaction('rw', db.wirdEntries, db.wirdVersions, async () => {
    await db.wirdEntries.clear()
    await db.wirdVersions.clear()
  })
})

describe('DhikrCompletionRepository', () => {
  it('appends an ordinary done entry', async () => {
    const result = await completeDhikr(DAY, 'version-1', 'istighfar', COMPLETED_AT)

    expect(result).toMatchObject({
      ok: true,
      value: {
        day: DAY,
        versionId: 'version-1',
        itemId: 'istighfar',
        done: true,
        at: COMPLETED_AT,
      },
    })
    expect(await db.wirdEntries.count()).toBe(1)
  })

  it('uses the latest event when determining whether an item is done', async () => {
    await appendEntry(DAY, 'version-1', 'istighfar', true, COMPLETED_AT)
    await appendEntry(DAY, 'version-1', 'istighfar', false, UNCHECKED_AT)

    await expect(isWirdItemDoneToday(DAY, 'istighfar')).resolves.toBe(false)
  })

  it('does not append a second linked completion on the same day', async () => {
    await addVersion(DAY, WIRD_LEVELS[0].wird, CREATED_AT)

    await expect(completeLinkedWirdItem(DAY, 'istighfar', COMPLETED_AT)).resolves.toMatchObject({
      ok: true,
      value: { done: true },
    })
    await expect(completeLinkedWirdItem(DAY, 'istighfar', UNCHECKED_AT)).resolves.toEqual({
      ok: true,
      value: null,
    })
    expect(await db.wirdEntries.where('[day+itemId]').equals([DAY, 'istighfar']).count()).toBe(1)
  })
})
