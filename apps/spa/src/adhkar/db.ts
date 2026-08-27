import {
  CATEGORY_TO_WIRD_ITEM,
  ONCE_DAILY_CATEGORIES,
  latestStateByItem,
  versionInForce,
} from '@nabd/shared'
import type { AdhkarProgressRepository, DayId, FlowState, Result, WirdEntry } from '@nabd/shared'

import { db } from '../db/db'
import { newId } from '../db/ids'
import { logger } from '../logger'

export async function readFlowProgress(
  categoryId: string,
  day: DayId,
): Promise<FlowState | undefined> {
  if (!ONCE_DAILY_CATEGORIES.has(categoryId)) return undefined
  try {
    const row = await db.adhkarFlow.get(categoryId)
    if (!row || row.day !== day) return undefined
    return { index: row.index, count: row.count, finished: row.finished }
  } catch (cause) {
    logger.error('adhkar.readFlowProgress failed', cause, { categoryId, day })
    return undefined
  }
}

export async function writeFlowProgress(
  categoryId: string,
  day: DayId,
  state: FlowState,
): Promise<void> {
  if (!ONCE_DAILY_CATEGORIES.has(categoryId)) return
  try {
    await db.adhkarFlow.put({ categoryId, day, ...state })
  } catch (cause) {
    logger.error('adhkar.writeFlowProgress failed', cause, { categoryId, day })
  }
}

export async function clearFlowProgress(categoryId: string): Promise<void> {
  if (!ONCE_DAILY_CATEGORIES.has(categoryId)) return
  try {
    await db.adhkarFlow.delete(categoryId)
  } catch (cause) {
    logger.error('adhkar.clearFlowProgress failed', cause, { categoryId })
  }
}

export async function completeLinkedWirdItem(
  day: DayId,
  categoryId: string,
  at: number,
): Promise<Result<WirdEntry | null>> {
  const itemId = CATEGORY_TO_WIRD_ITEM[categoryId]
  if (!itemId) return { ok: true, value: null }
  return completeWirdItem(day, itemId, at)
}

export async function isLinkedWirdItemDone(day: DayId, categoryId: string): Promise<boolean> {
  const itemId = CATEGORY_TO_WIRD_ITEM[categoryId]
  if (!itemId) return false

  try {
    const entries = await db.wirdEntries.where('[day+itemId]').equals([day, itemId]).toArray()
    return latestStateByItem(entries).get(itemId) ?? false
  } catch (cause) {
    logger.error('adhkar.isLinkedWirdItemDone failed', cause, { day, categoryId, itemId })
    return false
  }
}

// This stays in the adhkar repository so the library never couples to counter or wird storage.
export async function completeWirdItem(
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
    logger.error('adhkar.completeWirdItem failed', cause, { day, itemId })
    return { ok: false, error: 'complete_failed' }
  }
}

export const adhkarProgressRepository: AdhkarProgressRepository = {
  readFlowProgress: async (categoryId, day) => {
    const state = await readFlowProgress(categoryId, day)
    return state ? { categoryId, day, ...state } : undefined
  },
  writeFlowProgress,
  clearFlowProgress,
}
