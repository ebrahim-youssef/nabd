import { latestStateByItem } from '../lib/wird'
import { CATEGORY_TO_WIRD_ITEM, ONCE_DAILY_CATEGORIES } from './copy'
import type { AdhkarProgressRepository } from '../db/contracts'
import type { Result } from '../lib/result'
import type { DayId, WirdEntry } from '../wird/types'
import type { FlowState } from './logic'
import type { ProductDatabase } from '../db/productDatabase'
import {
  asEntry,
  readVersionInForce,
  runWirdStateTransaction,
  setItemStateInTransaction,
} from '../db/wirdState'
import type { EntryRow } from '../db/wirdState'
type Row = {
  category_id: string
  day: string
  flow_index: number
  count: number
  finished: number
}

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
          'SELECT category_id, day, "index" AS flow_index, count, finished FROM adhkar_flow_progress WHERE category_id = ?',
          categoryId,
        )
        return !row || row.day !== day
          ? undefined
          : {
              categoryId,
              day,
              index: row.flow_index,
              count: row.count,
              finished: row.finished === 1,
            }
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
          'SELECT id, day, version_id, item_id, done, at FROM wird_entries ' +
            'WHERE day = ? AND item_id = ? ORDER BY at, rowid',
          day,
          itemId,
        )
        return latestStateByItem(rows.map(asEntry)).get(itemId) ?? false
      } catch {
        return false
      }
    },
    async completeLinkedWirdItem(day, categoryId, at) {
      const itemId = CATEGORY_TO_WIRD_ITEM[categoryId]
      if (!itemId) return { ok: true, value: null }

      try {
        let value: WirdEntry | null = null
        await runWirdStateTransaction(database, async (transaction) => {
          const version = await readVersionInForce(transaction, day)
          const result = await setItemStateInTransaction(
            transaction,
            {
              day,
              versionId: version?.id ?? '',
              itemId,
              done: true,
              at,
            },
            version,
          )
          value = result.entry
          return result
        })
        return { ok: true, value }
      } catch {
        return { ok: false, error: 'complete_failed' }
      }
    },
  }
}
