import { db } from '@/lib/db/db'
import type { DayId, WirdEntry, WirdVersion } from '@/types/wird'

// Read-only Dexie access for statistics. Stats never write — they derive everything from the
// versions and entries the wird feature persists.

export async function getVersions(): Promise<WirdVersion[]> {
  return db.wirdVersions.toArray()
}

// All entries within an inclusive day range. Uses the `day` index; DayId strings sort
// chronologically, so a lexical between() is a chronological range.
export async function getEntriesInRange(fromDay: DayId, toDay: DayId): Promise<WirdEntry[]> {
  return db.wirdEntries.where('day').between(fromDay, toDay, true, true).toArray()
}

// Every entry across all history. The per-item drill-down (NBD-47) reckons streaks and misses
// over the item's whole lifetime, so it reads the full table (bounded by the user's tenure).
export async function getAllEntries(): Promise<WirdEntry[]> {
  return db.wirdEntries.toArray()
}
