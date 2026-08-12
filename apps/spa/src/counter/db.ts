import { latestStateByItem, versionInForce } from '@nabd/shared'
import type { DayId, DhikrCompletionRepository, Result, WirdEntry } from '@nabd/shared'

import { db } from '../db/db'
import { newId } from '../db/ids'
import { logger } from '../logger'

// The counter owns this append directly instead of importing the wird repository: feature
// repositories must not depend on one another. Its entry is the ordinary checklist event shape.
export async function completeDhikr(
  day: DayId,
  versionId: string,
  itemId: string,
  at: number,
): Promise<Result<WirdEntry>> {
  const entry: WirdEntry = { id: newId(), day, versionId, itemId, done: true, at }
  try {
    await db.wirdEntries.add(entry)
    return { ok: true, value: entry }
  } catch (cause) {
    logger.error('counter.completeDhikr failed', cause, { day, itemId })
    return { ok: false, error: 'complete_failed' }
  }
}

export async function isWirdItemDoneToday(day: DayId, itemId: string): Promise<boolean> {
  const entries = await db.wirdEntries.where('[day+itemId]').equals([day, itemId]).toArray()
  return latestStateByItem(entries).get(itemId) ?? false
}

export async function completeLinkedWirdItem(
  day: DayId,
  itemId: string,
  at: number,
): Promise<Result<WirdEntry | null>> {
  try {
    return await db.transaction('rw', db.wirdEntries, db.wirdVersions, async () => {
      const entries = await db.wirdEntries.where('[day+itemId]').equals([day, itemId]).toArray()
      if (latestStateByItem(entries).get(itemId)) return { ok: true, value: null }

      const version = versionInForce(await db.wirdVersions.toArray(), day)
      if (!version || !version.definition.items.some((item) => item.id === itemId)) {
        return { ok: true, value: null }
      }

      const entry: WirdEntry = { id: newId(), day, versionId: version.id, itemId, done: true, at }
      await db.wirdEntries.add(entry)
      return { ok: true, value: entry }
    })
  } catch (cause) {
    logger.error('counter.completeLinkedWirdItem failed', cause, { day, itemId })
    return { ok: false, error: 'complete_failed' }
  }
}

export const dhikrCompletionRepository: DhikrCompletionRepository = {
  completeDhikr,
  completeLinkedWirdItem,
  isWirdItemDoneToday,
}
