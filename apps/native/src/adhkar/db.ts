import {
  CATEGORY_TO_WIRD_ITEM,
  latestStateByItem,
  ONCE_DAILY_CATEGORIES,
  versionInForce,
} from '@nabd/shared'
import type { AdhkarProgressRepository, DayId, FlowState, Result, WirdEntry } from '@nabd/shared'
import type { ProductDatabase } from '../db/productDatabase'
import { SQLITE_ID } from '../db/productDatabase'
type Row = { category_id: string; day: string; index: number; count: number; finished: number }

type EntryRow = {
  id: string
  day: string
  version_id: string
  item_id: string
  done: number
  at: number
}

const toEntry = (row: EntryRow): WirdEntry => ({
  id: row.id,
  day: row.day,
  versionId: row.version_id,
  itemId: row.item_id,
  done: row.done === 1,
  at: row.at,
})

export type AdhkarRepository = AdhkarProgressRepository & {
  isLinkedWirdItemDone(day: DayId, categoryId: string): Promise<boolean>
  completeLinkedWirdItem(
    day: DayId,
    categoryId: string,
    at: number,
  ): Promise<Result<WirdEntry | null>>
}
export function createAdhkarProgressRepository(
  database: ProductDatabase,
): AdhkarProgressRepository {
  return {
    async readFlowProgress(categoryId, day) {
      if (!ONCE_DAILY_CATEGORIES.has(categoryId)) return undefined
      try {
        const row = await database.getFirstAsync<Row>(
          'SELECT category_id, day, "index" AS index, count, finished FROM adhkar_flow_progress WHERE category_id = ?',
          categoryId,
        )
        return !row || row.day !== day
          ? undefined
          : { categoryId, day, index: row.index, count: row.count, finished: row.finished === 1 }
      } catch {
        return undefined
      }
    },
    async writeFlowProgress(categoryId, day, state: FlowState) {
      if (!ONCE_DAILY_CATEGORIES.has(categoryId)) return
      try {
        await database.runAsync(
          'INSERT INTO adhkar_flow_progress (category_id, day, "index", count, finished) VALUES (?, ?, ?, ?, ?) ON CONFLICT(category_id) DO UPDATE SET day=excluded.day, "index"=excluded."index", count=excluded.count, finished=excluded.finished',
          categoryId,
          day,
          state.index,
          state.count,
          state.finished ? 1 : 0,
        )
      } catch {}
    },
    async clearFlowProgress(categoryId) {
      if (!ONCE_DAILY_CATEGORIES.has(categoryId)) return
      try {
        await database.runAsync(
          'DELETE FROM adhkar_flow_progress WHERE category_id = ?',
          categoryId,
        )
      } catch {}
    },
  }
}

export function createAdhkarRepository(database: ProductDatabase): AdhkarRepository {
  const progress = createAdhkarProgressRepository(database)

  return {
    ...progress,
    async isLinkedWirdItemDone(day, categoryId) {
      const itemId = CATEGORY_TO_WIRD_ITEM[categoryId]
      if (!itemId) return false
      try {
        const rows = await database.getAllAsync<EntryRow>(
          'SELECT id, day, version_id, item_id, done, at FROM wird_entries WHERE day = ? AND item_id = ?',
          day,
          itemId,
        )
        return latestStateByItem(rows.map(toEntry)).get(itemId) ?? false
      } catch {
        return false
      }
    },
    async completeLinkedWirdItem(day, categoryId, at) {
      const itemId = CATEGORY_TO_WIRD_ITEM[categoryId]
      if (!itemId) return { ok: true, value: null }

      try {
        let value: WirdEntry | null = null
        await database.withExclusiveTransactionAsync(async (transaction) => {
          const entries = (
            await transaction.getAllAsync<EntryRow>(
              'SELECT id, day, version_id, item_id, done, at FROM wird_entries WHERE day = ? AND item_id = ?',
              day,
              itemId,
            )
          ).map(toEntry)
          if (latestStateByItem(entries).get(itemId)) return

          const versions = (
            await transaction.getAllAsync<{
              id: string
              effective_from: string
              definition_json: string
              created_at: number
            }>('SELECT id, effective_from, definition_json, created_at FROM wird_versions')
          ).map((row) => ({
            id: row.id,
            effectiveFrom: row.effective_from,
            definition: JSON.parse(row.definition_json),
            createdAt: row.created_at,
          }))
          const version = versionInForce(versions, day)
          if (!version || !version.definition.items.some((item) => item.id === itemId)) return

          const row = await transaction.getFirstAsync<EntryRow>(
            `INSERT INTO wird_entries (id, day, version_id, item_id, done, at) VALUES (${SQLITE_ID}, ?, ?, ?, 1, ?) RETURNING id, day, version_id, item_id, done, at`,
            day,
            version.id,
            itemId,
            at,
          )
          if (!row) throw new Error('linked wird completion did not return a row')
          value = toEntry(row)
        })
        return { ok: true, value }
      } catch {
        return { ok: false, error: 'complete_failed' }
      }
    },
  }
}
