import { describe, expect, it } from 'vitest'

import { CALCULATION_METHODS, computeDayTimes, DEFAULT_METHOD_ID } from '../impure/prayer'

// Fixed input: Cairo, 2026-07-16. adhan.js is deterministic — same input, same output.
const CAIRO = { latitude: 30.0444, longitude: 31.2357 }
const DATE = new Date(2026, 6, 16)

describe('computeDayTimes', () => {
  it('computes an ordered day for every registered method', () => {
    for (const method of CALCULATION_METHODS) {
      const times = computeDayTimes(CAIRO, DATE, method.id)
      expect(times.fajr).toBeLessThan(times.sunrise)
      expect(times.sunrise).toBeLessThan(times.dhuhr)
      expect(times.dhuhr).toBeLessThan(times.asr)
      expect(times.asr).toBeLessThan(times.maghrib)
      expect(times.maghrib).toBeLessThan(times.isha)
    }
  })

  it('different methods produce different fajr times', () => {
    const egyptian = computeDayTimes(CAIRO, DATE, 'egyptian')
    const ummAlQura = computeDayTimes(CAIRO, DATE, 'umm_al_qura')
    expect(egyptian.fajr).not.toBe(ummAlQura.fajr)
  })

  it('defaults to the Egyptian method', () => {
    const explicit = computeDayTimes(CAIRO, DATE, DEFAULT_METHOD_ID)
    const implicit = computeDayTimes(CAIRO, DATE)
    expect(implicit).toEqual(explicit)
  })
})
