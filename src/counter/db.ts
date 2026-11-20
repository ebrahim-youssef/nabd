import { latestStateByItem } from '../lib/wird'
import type { DhikrCompletionRepository } from '../db/contracts'
import type { Result } from '../lib/result'
import type { DayId, WirdEntry } from '../wird/types'
import type { ProductDatabase } from '../db/productDatabase'
import { asEntry, readVersionInForce, setItemStateInTransaction } from '../db/wirdState'
import type { EntryRow } from '../db/wirdState'
import { queueWrite } from '../db/writeQueue'
export function createDhikrCompletionRepository(
  database: ProductDatabase,
): DhikrCompletionRepository {
  async function completeDhikr(
    day: DayId,
    versionId: string,
    itemId: string,
    at: number,
  ): Promise<Result<WirdEntry>> {
    try {
      let value: WirdEntry | null = null
      await queueWrite(() =>
        database.withExclusiveTransactionAsync(async (transaction) => {
          const result = await setItemStateInTransaction(transaction, {
            day,
            versionId,
            itemId,
            done: true,
            at,
          })
          value = result.entry
          if (!value && result.outcome === 'unchanged') {
            const row = await transaction.getFirstAsync<EntryRow>(
              'SELECT id, day, version_id, item_id, done, at FROM wird_entries WHERE day = ? AND item_id = ? ORDER BY at DESC, rowid DESC LIMIT 1',
              day,
              itemId,
            )
            value = row ? asEntry(row) : null
          }
          if (result.outcome === 'stale' || !value) {
            throw new Error(`wird item ${itemId} was stale or missing for day ${day}`)
          }
        }),
      )
      if (!value) throw new Error('wird item completion returned no entry')
      return { ok: true, value }
    } catch {
      return { ok: false, error: 'complete_failed' }
    }
  }
  return {
    completeDhikr,
    async isWirdItemDoneToday(day, itemId) {
      const rows = await database.getAllAsync<EntryRow>(
        'SELECT id, day, version_id, item_id, done, at FROM wird_entries ' +
          'WHERE day = ? AND item_id = ? ORDER BY at, rowid',
        day,
        itemId,
      )
      return latestStateByItem(rows.map(asEntry)).get(itemId) ?? false
    },
    async completeLinkedWirdItem(day, itemId, at): Promise<Result<WirdEntry | null>> {
      try {
        let value: WirdEntry | null = null
        await queueWrite(() =>
          database.withExclusiveTransactionAsync(async (tx) => {
            const version = await readVersionInForce(tx, day)
            const result = await setItemStateInTransaction(
              tx,
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
          }),
        )
        return { ok: true, value }
      } catch {
        return { ok: false, error: 'complete_failed' }
      }
    },
  }
}
