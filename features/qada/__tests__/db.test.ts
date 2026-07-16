import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { db } from '@/lib/db/db'

import { addQadaDebt, listQadaEvents, payQadaPrayer } from '../db'
import { qadaRemaining } from '../logic'

beforeEach(async () => {
  await db.qadaEvents.clear()
})

describe('qada ledger db', () => {
  it('a bulk debt lands on all five prayers and a payment decrements one', async () => {
    await addQadaDebt(3, 100)
    let remaining = qadaRemaining(await listQadaEvents())
    expect(remaining).toEqual({ fajr: 3, dhuhr: 3, asr: 3, maghrib: 3, isha: 3 })

    await payQadaPrayer('fajr', 200)
    remaining = qadaRemaining(await listQadaEvents())
    expect(remaining.fajr).toBe(2)
    expect(remaining.dhuhr).toBe(3)
  })

  it('a non-positive debt writes nothing', async () => {
    await addQadaDebt(0, 100)
    expect(await listQadaEvents()).toEqual([])
  })

  it('debts accumulate append-only', async () => {
    await addQadaDebt(2, 100)
    await addQadaDebt(1, 200)
    const remaining = qadaRemaining(await listQadaEvents())
    expect(remaining.asr).toBe(3)
    expect((await listQadaEvents()).length).toBe(10)
  })
})
