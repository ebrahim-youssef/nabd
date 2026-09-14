import { nextDay, sameDefinition, versionInForce } from '@nabd/shared'
import type {
  DayId,
  Result,
  WirdDefinition,
  WirdEntry,
  WirdRepository,
  WirdVersion,
} from '@nabd/shared'
import { SQLITE_ID, type ProductDatabase } from '../db/productDatabase'

type VersionRow = {
  id: string
  effective_from: string
  definition_json: string
  created_at: number
}
type EntryRow = {
  id: string
  day: string
  version_id: string
  item_id: string
  done: number
  at: number
}
const asVersion = (row: VersionRow): WirdVersion => ({
  id: row.id,
  effectiveFrom: row.effective_from,
  definition: JSON.parse(row.definition_json) as WirdDefinition,
  createdAt: row.created_at,
})
const asEntry = (row: EntryRow): WirdEntry => ({
  id: row.id,
  day: row.day,
  versionId: row.version_id,
  itemId: row.item_id,
  done: row.done === 1,
  at: row.at,
})

export function createWirdRepository(database: ProductDatabase): WirdRepository {
  async function listVersions() {
    return (
      await database.getAllAsync<VersionRow>(
        'SELECT id, effective_from, definition_json, created_at FROM wird_versions ORDER BY effective_from, created_at',
      )
    ).map(asVersion)
  }
  async function addVersion(
    effectiveFrom: DayId,
    definition: WirdDefinition,
    createdAt: number,
  ): Promise<Result<WirdVersion>> {
    try {
      const row = await database.getFirstAsync<VersionRow>(
        `INSERT INTO wird_versions (id, effective_from, definition_json, created_at) VALUES (${SQLITE_ID}, ?, ?, ?) RETURNING id, effective_from, definition_json, created_at`,
        effectiveFrom,
        JSON.stringify(definition),
        createdAt,
      )
      if (!row) throw new Error('missing version')
      return { ok: true, value: asVersion(row) }
    } catch {
      return { ok: false, error: 'add_version_failed' }
    }
  }
  async function appendEntry(
    day: DayId,
    versionId: string,
    itemId: string,
    done: boolean,
    at: number,
  ): Promise<Result<WirdEntry>> {
    try {
      const row = await database.getFirstAsync<EntryRow>(
        `INSERT INTO wird_entries (id, day, version_id, item_id, done, at) VALUES (${SQLITE_ID}, ?, ?, ?, ?, ?) RETURNING id, day, version_id, item_id, done, at`,
        day,
        versionId,
        itemId,
        done ? 1 : 0,
        at,
      )
      if (!row) throw new Error('missing entry')
      return { ok: true, value: asEntry(row) }
    } catch {
      return { ok: false, error: 'append_entry_failed' }
    }
  }
  return {
    listVersions,
    addVersion,
    appendEntry,
    async getDayEntries(day) {
      return (
        await database.getAllAsync<EntryRow>(
          'SELECT id, day, version_id, item_id, done, at FROM wird_entries WHERE day = ?',
          day,
        )
      ).map(asEntry)
    },
    async getMonthEntries(month) {
      return (
        await database.getAllAsync<EntryRow>(
          'SELECT id, day, version_id, item_id, done, at FROM wird_entries WHERE day LIKE ?',
          `${month}-%`,
        )
      ).map(asEntry)
    },
    async getEntriesInRange(fromDay, toDay) {
      return (
        await database.getAllAsync<EntryRow>(
          'SELECT id, day, version_id, item_id, done, at FROM wird_entries WHERE day BETWEEN ? AND ?',
          fromDay,
          toDay,
        )
      ).map(asEntry)
    },
    async getAllEntries() {
      return (
        await database.getAllAsync<EntryRow>(
          'SELECT id, day, version_id, item_id, done, at FROM wird_entries',
        )
      ).map(asEntry)
    },
    async setWirdLevel(definition, today, now) {
      const current = versionInForce(await listVersions(), nextDay(today))
      return current && sameDefinition(current.definition, definition)
        ? { ok: true, value: current }
        : addVersion(nextDay(today), definition, now)
    },
  }
}
