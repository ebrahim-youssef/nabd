import { describe, expect, it } from 'vitest'

import { compareDayId, isDayId, toDayId } from '@/lib/pure/day'

describe('toDayId', () => {
  it('formats a Date to local YYYY-MM-DD with zero-padding', () => {
    expect(toDayId(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toDayId(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})

describe('isDayId', () => {
  it('accepts well-formed day ids and rejects others', () => {
    expect(isDayId('2026-07-14')).toBe(true)
    expect(isDayId('2026-7-14')).toBe(false)
    expect(isDayId('not-a-day')).toBe(false)
  })
})

describe('compareDayId', () => {
  it('orders chronologically', () => {
    expect(compareDayId('2026-01-01', '2026-02-01')).toBeLessThan(0)
    expect(compareDayId('2026-02-01', '2026-01-01')).toBeGreaterThan(0)
    expect(compareDayId('2026-01-01', '2026-01-01')).toBe(0)
  })
})
