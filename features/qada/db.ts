import { db, type QadaEvent } from '@/lib/db/db'
import { newId } from '@/lib/db/ids'
import { logger } from '@/lib/logger'
import type { Result } from '@/types/result'

import { QADA_PRAYERS, type QadaPrayerId } from './logic'

// All Dexie access for the qada ledger (ADR-0010). Append-only: debts and payments are
// events, never edits. Local-only for now — sync integration is a named follow-up.

export async function listQadaEvents(): Promise<QadaEvent[]> {
  return db.qadaEvents.toArray()
}

// One bulk debt: the estimated missed days land on every prayer as a +days event each.
export async function addQadaDebt(days: number, at: number): Promise<Result<null>> {
  if (days <= 0) return { ok: true, value: null }
  const events: QadaEvent[] = QADA_PRAYERS.map((prayer) => ({
    id: newId(),
    prayerId: prayer.id,
    delta: days,
    at,
  }))
  try {
    await db.qadaEvents.bulkAdd(events)
    return { ok: true, value: null }
  } catch (cause) {
    logger.error('qada.addQadaDebt failed', cause, { days })
    return { ok: false, error: 'add_debt_failed' }
  }
}

// One paid-back prayer: a −1 event for that prayer.
export async function payQadaPrayer(prayerId: QadaPrayerId, at: number): Promise<Result<null>> {
  try {
    await db.qadaEvents.add({ id: newId(), prayerId, delta: -1, at })
    return { ok: true, value: null }
  } catch (cause) {
    logger.error('qada.payQadaPrayer failed', cause, { prayerId })
    return { ok: false, error: 'pay_failed' }
  }
}
