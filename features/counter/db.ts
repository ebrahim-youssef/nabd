import { db } from '@/lib/db/db'
import { newId } from '@/lib/db/ids'
import { logger } from '@/lib/logger'
import type { Result } from '@/types/result'
import type { DayId, WirdEntry } from '@/types/wird'

// Marks a dhikr's linked wird item complete when its counter reaches the target. The counter
// feature owns this write and goes straight to the Dexie handle (append done entry + outbox in
// one transaction) rather than reaching into the wird feature's repository — cross-feature
// repository imports are disallowed. The entry shape is identical to a manual check-off, so
// stats and the checklist treat a counted dhikr exactly like any other completed item.
export async function completeDhikr(
  day: DayId,
  versionId: string,
  itemId: string,
  at: number,
): Promise<Result<WirdEntry>> {
  const entry: WirdEntry = { id: newId(), day, versionId, itemId, done: true, at }
  try {
    await db.transaction('rw', db.wirdEntries, db.outbox, async () => {
      await db.wirdEntries.add(entry)
      await db.outbox.add({ table: 'wirdEntries', rowId: entry.id, payload: entry, createdAt: at })
    })
    return { ok: true, value: entry }
  } catch (cause) {
    logger.error('counter.completeDhikr failed', cause, { day, itemId })
    return { ok: false, error: 'complete_failed' }
  }
}
