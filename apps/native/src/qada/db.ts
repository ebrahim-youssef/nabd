import { QADA_PRAYERS } from '@nabd/shared'
import type { QadaEvent, QadaPrayerId, QadaRepository, Result } from '@nabd/shared'
import { SQLITE_ID, type ProductDatabase } from '../db/productDatabase'

type Row = { id: string; prayer_id: QadaPrayerId; delta: number; at: number }
const asEvent = (row: Row): QadaEvent => ({
  id: row.id,
  prayerId: row.prayer_id,
  delta: row.delta,
  at: row.at,
})

export function createQadaRepository(database: ProductDatabase): QadaRepository {
  return {
    async listQadaEvents() {
      return (
        await database.getAllAsync<Row>('SELECT id, prayer_id, delta, at FROM qada_events')
      ).map(asEvent)
    },
    async addQadaDebt(days: number, at: number): Promise<Result<null>> {
      if (days <= 0) return { ok: true, value: null }
      try {
        await database.withExclusiveTransactionAsync(async (transaction) => {
          for (const prayer of QADA_PRAYERS)
            await transaction.runAsync(
              `INSERT INTO qada_events (id, prayer_id, delta, at) VALUES (${SQLITE_ID}, ?, ?, ?)`,
              prayer.id,
              days,
              at,
            )
        })
        return { ok: true, value: null }
      } catch {
        return { ok: false, error: 'add_debt_failed' }
      }
    },
    async payQadaPrayer(prayerId: QadaPrayerId, at: number): Promise<Result<null>> {
      try {
        await database.runAsync(
          `INSERT INTO qada_events (id, prayer_id, delta, at) VALUES (${SQLITE_ID}, ?, -1, ?)`,
          prayerId,
          at,
        )
        return { ok: true, value: null }
      } catch {
        return { ok: false, error: 'pay_failed' }
      }
    },
  }
}
