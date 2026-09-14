import { ONCE_DAILY_CATEGORIES } from '@nabd/shared'
import type { AdhkarProgressRepository, FlowState } from '@nabd/shared'
import type { ProductDatabase } from '../db/productDatabase'
type Row = { category_id: string; day: string; index: number; count: number; finished: number }
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
