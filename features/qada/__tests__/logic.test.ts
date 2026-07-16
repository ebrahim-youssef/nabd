import { describe, expect, it } from 'vitest'

import {
  DAYS_PER_MONTH,
  DAYS_PER_YEAR,
  daysFromPeriod,
  qadaRemaining,
  type QadaEventLike,
} from '../logic'

function event(prayerId: string, delta: number): QadaEventLike {
  return { prayerId, delta }
}

describe('daysFromPeriod', () => {
  it('converts a mixed period with the fixed factors', () => {
    expect(daysFromPeriod(1, 1, 1)).toBe(DAYS_PER_YEAR + DAYS_PER_MONTH + 1)
    expect(daysFromPeriod(0, 0, 3)).toBe(3)
    expect(daysFromPeriod(2, 0, 0)).toBe(2 * DAYS_PER_YEAR)
  })

  it('treats negative, NaN, and fractional parts as safe values', () => {
    expect(daysFromPeriod(-1, Number.NaN, 2.9)).toBe(2)
    expect(daysFromPeriod(0, 0, 0)).toBe(0)
  })
})

describe('qadaRemaining', () => {
  it('starts every prayer at zero', () => {
    const remaining = qadaRemaining([])
    expect(remaining).toEqual({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 })
  })

  it('folds debts and payments per prayer', () => {
    const remaining = qadaRemaining([event('fajr', 3), event('dhuhr', 3), event('fajr', -1)])
    expect(remaining.fajr).toBe(2)
    expect(remaining.dhuhr).toBe(3)
    expect(remaining.asr).toBe(0)
  })

  it('clamps at zero — over-payment never goes negative', () => {
    const remaining = qadaRemaining([event('isha', 1), event('isha', -1), event('isha', -1)])
    expect(remaining.isha).toBe(0)
  })

  it('ignores unknown prayer ids', () => {
    const remaining = qadaRemaining([event('sunrise', 5)])
    expect(remaining).toEqual({ fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 })
  })
})
