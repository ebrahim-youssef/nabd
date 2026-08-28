import { beforeEach, describe, expect, it } from 'vitest'

import { INITIAL_FLOW, WIRD_LEVELS } from '@nabd/shared'

import { db } from '../db/db'
import { addVersion } from '../wird/db'
import {
  clearFlowProgress,
  completeLinkedWirdItem,
  readFlowProgress,
  writeFlowProgress,
} from './db'

const DAY = '2026-08-12'
const STALE_DAY = '2026-08-11'
const AT = 1_755_000_000_000

beforeEach(async () => {
  await db.transaction('rw', db.adhkarFlow, db.wirdEntries, db.wirdVersions, async () => {
    await db.adhkarFlow.clear()
    await db.wirdEntries.clear()
    await db.wirdVersions.clear()
  })
})

describe('AdhkarProgressRepository', () => {
  it('restores once-daily progress for the same day', async () => {
    const state = { ...INITIAL_FLOW, count: 1 }
    await writeFlowProgress('morning', DAY, state)
    await expect(readFlowProgress('morning', DAY)).resolves.toEqual(state)
  })

  it('ignores stale progress', async () => {
    await writeFlowProgress('morning', STALE_DAY, { ...INITIAL_FLOW, count: 1 })
    await expect(readFlowProgress('morning', DAY)).resolves.toBeUndefined()
  })

  it('does not store repeatable category state', async () => {
    await writeFlowProgress('sleep', DAY, { ...INITIAL_FLOW, count: 1 })
    await clearFlowProgress('sleep')
    expect(await db.adhkarFlow.get('sleep')).toBeUndefined()
    await expect(readFlowProgress('sleep', DAY)).resolves.toBeUndefined()
  })

  it('appends one linked completion only when today version contains its item', async () => {
    const itemId = WIRD_LEVELS[0].wird.items.find((item) => item.id === 'morning-adhkar')?.id
    expect(itemId).toBeDefined()
    await addVersion(DAY, WIRD_LEVELS[0].wird, AT)

    await expect(completeLinkedWirdItem(DAY, 'morning', AT)).resolves.toMatchObject({
      ok: true,
      value: { itemId, done: true },
    })
    await expect(completeLinkedWirdItem(DAY, 'morning', AT + 1)).resolves.toEqual({
      ok: true,
      value: null,
    })
    expect(await db.wirdEntries.where('[day+itemId]').equals([DAY, itemId!]).count()).toBe(1)
  })
})
