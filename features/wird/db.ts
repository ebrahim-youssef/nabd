import { db, type SyncTable } from '@/lib/db/db'
import { newId } from '@/lib/db/ids'
import { logger } from '@/lib/logger'
import type { Result } from '@/types/result'
import type { DayId, WirdDefinition, WirdEntry, WirdVersion } from '@/types/wird'

// All Dexie access for the wird feature. Writes go through a transaction that also enqueues an
// outbox row, so a local change is durable and queued for sync atomically. Time (`at`,
// `createdAt`) is passed in by the caller (the hook reads the clock) — this module stays free
// of `Date.now()`.

// Enqueues a synced row for push. Called inside the same transaction as the write so a row can
// never be persisted without its outbox entry. Both synced tables are append-only/immutable,
// so the push is an idempotent upsert.
async function enqueue(
  table: SyncTable,
  rowId: string,
  payload: WirdVersion | WirdEntry,
  at: number,
) {
  await db.outbox.add({ table, rowId, payload, createdAt: at })
}

export async function listVersions(): Promise<WirdVersion[]> {
  return db.wirdVersions.toArray()
}

export async function getDayEntries(day: DayId): Promise<WirdEntry[]> {
  return db.wirdEntries.where('day').equals(day).toArray()
}

// Creates a new immutable wird version and queues it for sync.
export async function addVersion(
  effectiveFrom: DayId,
  definition: WirdDefinition,
  createdAt: number,
): Promise<Result<WirdVersion>> {
  const version: WirdVersion = { id: newId(), effectiveFrom, definition, createdAt }
  try {
    await db.transaction('rw', db.wirdVersions, db.outbox, async () => {
      await db.wirdVersions.add(version)
      await enqueue('wirdVersions', version.id, version, createdAt)
    })
    return { ok: true, value: version }
  } catch (cause) {
    logger.error('wird.addVersion failed', cause, { effectiveFrom })
    return { ok: false, error: 'add_version_failed' }
  }
}

// Ensures at least one version exists, seeding one effective from `day` if the store is empty.
// Returns the seeded version, or null when a version already existed (nothing to do).
export async function seedVersionIfEmpty(
  day: DayId,
  definition: WirdDefinition,
  createdAt: number,
): Promise<Result<WirdVersion | null>> {
  try {
    const count = await db.wirdVersions.count()
    if (count > 0) return { ok: true, value: null }
    const seeded = await addVersion(day, definition, createdAt)
    return seeded.ok ? { ok: true, value: seeded.value } : seeded
  } catch (cause) {
    logger.error('wird.seedVersionIfEmpty failed', cause, { day })
    return { ok: false, error: 'seed_failed' }
  }
}

// Appends a check/uncheck event for one item on one day. Append-only: never edits or deletes a
// prior entry (ADR-0006 §3). Callers resolve `versionId` via `versionInForce` in logic.ts.
export async function appendEntry(
  day: DayId,
  versionId: string,
  itemId: string,
  done: boolean,
  at: number,
): Promise<Result<WirdEntry>> {
  const entry: WirdEntry = { id: newId(), day, versionId, itemId, done, at }
  try {
    await db.transaction('rw', db.wirdEntries, db.outbox, async () => {
      await db.wirdEntries.add(entry)
      await enqueue('wirdEntries', entry.id, entry, at)
    })
    return { ok: true, value: entry }
  } catch (cause) {
    logger.error('wird.appendEntry failed', cause, { day, itemId, done })
    return { ok: false, error: 'append_entry_failed' }
  }
}
