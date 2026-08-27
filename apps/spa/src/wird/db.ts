import { nextDay, sameDefinition, versionInForce } from '@nabd/shared'
import type {
  DayId,
  Result,
  WirdDefinition,
  WirdEntry,
  WirdRepository,
  WirdVersion,
} from '@nabd/shared'

import { db } from '../db/db'
import { newId } from '../db/ids'
import { logger } from '../logger'

export async function listVersions(): Promise<WirdVersion[]> {
  return db.wirdVersions.toArray()
}

export async function getDayEntries(day: DayId): Promise<WirdEntry[]> {
  return db.wirdEntries.where('day').equals(day).toArray()
}

export async function getMonthEntries(month: string): Promise<WirdEntry[]> {
  return db.wirdEntries.where('day').startsWith(`${month}-`).toArray()
}

export async function getEntriesInRange(fromDay: DayId, toDay: DayId): Promise<WirdEntry[]> {
  return db.wirdEntries.where('day').between(fromDay, toDay, true, true).toArray()
}

export async function getAllEntries(): Promise<WirdEntry[]> {
  return db.wirdEntries.toArray()
}

export async function addVersion(
  effectiveFrom: DayId,
  definition: WirdDefinition,
  createdAt: number,
): Promise<Result<WirdVersion>> {
  const version: WirdVersion = { id: newId(), effectiveFrom, definition, createdAt }
  try {
    await db.wirdVersions.add(version)
    return { ok: true, value: version }
  } catch (cause) {
    logger.error('wird.addVersion failed', cause, { effectiveFrom })
    return { ok: false, error: 'add_version_failed' }
  }
}

export async function appendEntry(
  day: DayId,
  versionId: string,
  itemId: string,
  done: boolean,
  at: number,
): Promise<Result<WirdEntry>> {
  const entry: WirdEntry = { id: newId(), day, versionId, itemId, done, at }
  try {
    await db.wirdEntries.add(entry)
    return { ok: true, value: entry }
  } catch (cause) {
    logger.error('wird.appendEntry failed', cause, { day, itemId, done })
    return { ok: false, error: 'append_entry_failed' }
  }
}

export async function appendEntryForDay(
  day: DayId,
  itemId: string,
  done: boolean,
  at: number,
): Promise<Result<WirdEntry>> {
  const version = versionInForce(await listVersions(), day)
  if (!version) return { ok: false, error: 'version_not_found' }
  return appendEntry(day, version.id, itemId, done, at)
}

// A manual level change from settings. Effective tomorrow, never today: today's wird is already
// part-checked, and reinterpreting it under a new definition would rewrite the day the user is
// standing in — the visible «يبدأ الورد الجديد من الغد» hint is this rule's promise. Choosing the
// level already in force for tomorrow returns that version and writes nothing, so repeated taps
// cannot pile up versions.
export async function setWirdLevel(
  definition: WirdDefinition,
  today: DayId,
  now: number,
): Promise<Result<WirdVersion | null>> {
  const versions = await listVersions()
  const tomorrow = nextDay(today)
  const tomorrowVersion = versionInForce(versions, tomorrow)
  if (tomorrowVersion && sameDefinition(tomorrowVersion.definition, definition)) {
    return { ok: true, value: tomorrowVersion }
  }
  return addVersion(tomorrow, definition, now)
}

export const wirdRepository: WirdRepository = {
  listVersions,
  getDayEntries,
  getMonthEntries,
  getEntriesInRange,
  getAllEntries,
  addVersion,
  setWirdLevel,
  appendEntry,
}
