import 'fake-indexeddb/auto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { qadaRemaining } from '@nabd/shared'

import { db } from '../db/db'
import { addQadaDebt, listQadaEvents, payQadaPrayer } from './db'

vi.mock('../logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const FIRST_TIME = 1_755_000_000_000

beforeEach(async () => {
  await db.qadaEvents.clear()
})

describe('qadaRepository', () => {
  it('fans a debt out into five append-only prayer events', async () => {
    await addQadaDebt(3, FIRST_TIME)

    const events = await listQadaEvents()
    expect(events).toHaveLength(5)
    expect(events.map(({ prayerId, delta, at }) => ({ prayerId, delta, at }))).toEqual(
      expect.arrayContaining([
        { prayerId: 'fajr', delta: 3, at: FIRST_TIME },
        { prayerId: 'dhuhr', delta: 3, at: FIRST_TIME },
        { prayerId: 'asr', delta: 3, at: FIRST_TIME },
        { prayerId: 'maghrib', delta: 3, at: FIRST_TIME },
        { prayerId: 'isha', delta: 3, at: FIRST_TIME },
      ]),
    )
  })

  it('does not write an event for a non-positive debt', async () => {
    await addQadaDebt(0, FIRST_TIME)
    await addQadaDebt(-1, FIRST_TIME)

    expect(await listQadaEvents()).toEqual([])
  })

  it('appends a payment without mutating the debt event', async () => {
    await addQadaDebt(1, FIRST_TIME)
    const [debt] = await listQadaEvents()
    await payQadaPrayer('fajr', FIRST_TIME + 1)

    const events = await listQadaEvents()
    expect(events).toHaveLength(6)
    expect(await db.qadaEvents.get(debt.id)).toEqual(debt)
    expect(events.find((event) => event.prayerId === 'fajr' && event.delta === -1)).toMatchObject({
      at: FIRST_TIME + 1,
    })
  })

  it('clamps stored over-payments at zero', async () => {
    await payQadaPrayer('fajr', FIRST_TIME)
    await payQadaPrayer('fajr', FIRST_TIME + 1)

    expect(qadaRemaining(await listQadaEvents()).fajr).toBe(0)
  })
})
