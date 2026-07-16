import { db, type SyncTable } from '@/lib/db/db'
import { newId } from '@/lib/db/ids'
import { nextDay } from '@/lib/pure/day'
import { logger } from '@/lib/logger'
import type { Result } from '@/types/result'
import type { DayId, WirdDefinition, WirdEntry, WirdVersion } from '@/types/wird'

import { levelMatching, sameDefinition, versionInForce } from './logic'

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

// All entries in calendar month `month` ('YYYY-MM') — feeds monthly-goal progress
// (ADR-0008). DayIds sort lexicographically, so a prefix scan on the day index is exact.
export async function getMonthEntries(month: string): Promise<WirdEntry[]> {
  return db.wirdEntries.where('day').startsWith(`${month}-`).toArray()
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

// Single-flight guard: React StrictMode double-runs effects (and several consumers may
// mount), but one session needs at most one upgrade pass.
let upgradeRun: Promise<void> | null = null

// Self-healing level upgrade (NBD-40): when the level definition in content/levels.ts evolves
// (e.g. rawatib split into per-prayer items), an existing user's stored snapshot is superseded
// by a new version — effective today if today is still untouched (no intra-day ambiguity,
// ADR-0006 §2), otherwise tomorrow. Past days keep their old snapshot, so stats never move.
// Idempotent: equal definitions (or an already-written equal version) short-circuit.
export function upgradeVersionToCurrentLevel(
  levels: { wird: WirdDefinition }[],
  today: DayId,
  now: number,
): Promise<void> {
  upgradeRun ??= runLevelUpgrade(levels, today, now)
  return upgradeRun
}

async function runLevelUpgrade(
  levels: { wird: WirdDefinition }[],
  today: DayId,
  now: number,
): Promise<void> {
  try {
    const versions = await listVersions()
    const current = versionInForce(versions, today)
    if (!current) return

    const level = levelMatching(current.definition, levels)
    if (!level || sameDefinition(current.definition, level.wird)) return

    // An equal version effective today or later means a previous run already upgraded.
    const alreadyUpgraded = versions.some(
      (version) => version.effectiveFrom >= today && sameDefinition(version.definition, level.wird),
    )
    if (alreadyUpgraded) return

    const todayEntries = await getDayEntries(today)
    const effectiveFrom = todayEntries.length === 0 ? today : nextDay(today)
    await addVersion(effectiveFrom, level.wird, now)
  } catch (cause) {
    // Best-effort: the old snapshot keeps working; the next visit retries.
    logger.error('wird.upgradeVersionToCurrentLevel failed', cause, { today })
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
