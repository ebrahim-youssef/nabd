import { db } from '@/lib/db/db'
import { newId } from '@/lib/db/ids'
import { logger } from '@/lib/logger'
import { versionInForce } from '@/lib/pure/wird'
import type { Result } from '@/types/result'
import type { DayId, WirdEntry } from '@/types/wird'

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
