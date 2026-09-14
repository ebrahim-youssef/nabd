import { latestStateByItem, versionInForce } from '@nabd/shared'
import type { DhikrCompletionRepository, Result, WirdEntry } from '@nabd/shared'
import { SQLITE_ID, type ProductDatabase } from '../db/productDatabase'
type EntryRow = {
  id: string
  day: string
  version_id: string
  item_id: string
  done: number
  at: number
}
const entry = (r: EntryRow): WirdEntry => ({
  id: r.id,
  day: r.day,
  versionId: r.version_id,
  itemId: r.item_id,
  done: r.done === 1,
  at: r.at,
})
export function createDhikrCompletionRepository(
  database: ProductDatabase,
): DhikrCompletionRepository {
  async function completeDhikr(
    day: string,
    versionId: string,
    itemId: string,
    at: number,
  ): Promise<Result<WirdEntry>> {
    try {
      const row = await database.getFirstAsync<EntryRow>(
        `INSERT INTO wird_entries (id, day, version_id, item_id, done, at) VALUES (${SQLITE_ID}, ?, ?, ?, 1, ?) RETURNING id, day, version_id, item_id, done, at`,
        day,
        versionId,
        itemId,
        at,
      )
      if (!row) throw new Error()
      return { ok: true, value: entry(row) }
    } catch {
      return { ok: false, error: 'complete_failed' }
    }
  }
  return {
    completeDhikr,
    async isWirdItemDoneToday(day, itemId) {
      const rows = await database.getAllAsync<EntryRow>(
        'SELECT id, day, version_id, item_id, done, at FROM wird_entries WHERE day = ? AND item_id = ?',
        day,
        itemId,
      )
      return latestStateByItem(rows.map(entry)).get(itemId) ?? false
    },
    async completeLinkedWirdItem(day, itemId, at): Promise<Result<WirdEntry | null>> {
      try {
        let value: WirdEntry | null = null
        await database.withExclusiveTransactionAsync(async (tx) => {
          const entries = (
            await tx.getAllAsync<EntryRow>(
              'SELECT id, day, version_id, item_id, done, at FROM wird_entries WHERE day = ? AND item_id = ?',
              day,
              itemId,
            )
          ).map(entry)
          if (latestStateByItem(entries).get(itemId)) return
          const versions = (
            await tx.getAllAsync<{
              id: string
              effective_from: string
              definition_json: string
              created_at: number
            }>('SELECT id, effective_from, definition_json, created_at FROM wird_versions')
          ).map((r) => ({
            id: r.id,
            effectiveFrom: r.effective_from,
            definition: JSON.parse(r.definition_json),
            createdAt: r.created_at,
          }))
          const v = versionInForce(versions, day)
          if (!v || !v.definition.items.some((i) => i.id === itemId)) return
          const row = await tx.getFirstAsync<EntryRow>(
            `INSERT INTO wird_entries (id, day, version_id, item_id, done, at) VALUES (${SQLITE_ID}, ?, ?, ?, 1, ?) RETURNING id, day, version_id, item_id, done, at`,
            day,
            v.id,
            itemId,
            at,
          )
          if (!row) throw new Error()
          value = entry(row)
        })
        return { ok: true, value }
      } catch {
        return { ok: false, error: 'complete_failed' }
      }
    },
  }
}
