import { db, type AdhkarFlowRow } from '@/lib/db/db'
import { newId } from '@/lib/db/ids'
import { logger } from '@/lib/logger'
import { latestStateByItem, versionInForce } from '@/lib/pure/wird'
import type { Result } from '@/types/result'
import type { DayId, WirdEntry } from '@/types/wird'

import type { FlowState } from './logic'

// Marks the linked wird item (أذكار الصباح/المساء) complete when the guided flow finishes a
// category (NBD-29). Goes straight to the Dexie handle — cross-feature repository imports
// are disallowed (same pattern as counter/db.ts). The entry shape is identical to a manual
// check-off, so the checklist, ring, and stats treat it exactly the same.
export async function completeLinkedWirdItem(
  day: DayId,
  itemId: string,
  at: number,
): Promise<Result<WirdEntry | null>> {
  try {
    const versions = await db.wirdVersions.toArray()
    const version = versionInForce(versions, day)
    // No wird yet, or this category has no linked item in the current wird → nothing to do.
    if (!version || !version.definition.items.some((item) => item.id === itemId)) {
      return { ok: true, value: null }
    }
    const entry: WirdEntry = { id: newId(), day, versionId: version.id, itemId, done: true, at }
    await db.transaction('rw', db.wirdEntries, db.outbox, async () => {
      await db.wirdEntries.add(entry)
      await db.outbox.add({ table: 'wirdEntries', rowId: entry.id, payload: entry, createdAt: at })
    })
    return { ok: true, value: entry }
  } catch (cause) {
    logger.error('adhkar.completeLinkedWirdItem failed', cause, { day, itemId })
    return { ok: false, error: 'complete_failed' }
  }
}

// Whether a wird item's latest state today is `done` (NBD-51). Mirrors completeLinkedWirdItem
// the other way: checking أذكار الصباح/المساء in the wird lets the library flow show the
// category finished. A derived read — no positional state is written here; the durable truth
// stays the append-only wird entries.
export async function isWirdItemDoneToday(day: DayId, itemId: string): Promise<boolean> {
  try {
    const entries = await db.wirdEntries.where('day').equals(day).toArray()
    return latestStateByItem(entries).get(itemId) ?? false
  } catch (cause) {
    logger.error('adhkar.isWirdItemDoneToday failed', cause, { day, itemId })
    return false
  }
}

// Flow-position persistence for the once-daily categories (NBD-41). Local-only rows — the
// synced, durable record stays the wird entry above. All best-effort: losing a row only
// costs re-counting a dhikr.

export async function readFlowProgress(categoryId: string): Promise<AdhkarFlowRow | undefined> {
  try {
    return await db.adhkarFlow.get(categoryId)
  } catch (cause) {
    logger.error('adhkar.readFlowProgress failed', cause, { categoryId })
    return undefined
  }
}

export async function writeFlowProgress(
  categoryId: string,
  day: DayId,
  state: FlowState,
): Promise<void> {
  try {
    await db.adhkarFlow.put({ categoryId, day, ...state })
  } catch (cause) {
    logger.error('adhkar.writeFlowProgress failed', cause, { categoryId, day })
  }
}

export async function clearFlowProgress(categoryId: string): Promise<void> {
  try {
    await db.adhkarFlow.delete(categoryId)
  } catch (cause) {
    logger.error('adhkar.clearFlowProgress failed', cause, { categoryId })
  }
}
