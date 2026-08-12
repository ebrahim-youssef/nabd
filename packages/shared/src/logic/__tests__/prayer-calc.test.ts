import { Coordinates, Madhab, PrayerTimes } from 'adhan'
import { describe, expect, it } from 'vitest'

import {
  CALCULATION_METHODS,
  DEFAULT_METHOD_ID,
  computeDayTimes,
  isCalculationMethodId,
} from '../prayer-calc'

// Cairo, and a fixed instant so the assertions never depend on the day the suite runs.
const CAIRO = { latitude: 30.0444, longitude: 31.2357 }
const DAY = new Date('2026-08-12T09:00:00Z')

// Every assertion here is deliberately relative — ordering, or one method against another. A
// literal wall-clock expectation would encode the machine's timezone and fail on a CI runner in
// UTC while passing locally.
describe('computeDayTimes', () => {
  it('returns the day in chronological order', () => {
    const times = computeDayTimes(CAIRO, DAY, 'egyptian')
    expect(times.fajr).toBeLessThan(times.sunrise)
    expect(times.sunrise).toBeLessThan(times.dhuhr)
    expect(times.dhuhr).toBeLessThan(times.asr)
    expect(times.asr).toBeLessThan(times.maghrib)
    expect(times.maghrib).toBeLessThan(times.isha)
  })

  it('lands every point inside the requested local day', () => {
    const times = computeDayTimes(CAIRO, DAY, 'egyptian')
    const startOfDay = new Date(DAY)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = startOfDay.getTime() + 86_400_000
    for (const at of Object.values(times)) {
      expect(at).toBeGreaterThanOrEqual(startOfDay.getTime())
      expect(at).toBeLessThan(endOfDay)
    }
  })

  it('changes the calculation when the method changes', () => {
    const egyptian = computeDayTimes(CAIRO, DAY, 'egyptian')
    const ummAlQura = computeDayTimes(CAIRO, DAY, 'umm_al_qura')
    // What a method really disagrees about is the twilight angle, so Fajr moves by minutes. Noon is
    // a solar fact and barely moves — the methods carry small fixed adjustments to it, so this
    // compares the two gaps rather than claiming Dhuhr is identical. Fajr moving is the property
    // the settings picker relies on.
    expect(ummAlQura.fajr).not.toBe(egyptian.fajr)
    const fajrGap = Math.abs(ummAlQura.fajr - egyptian.fajr)
    const dhuhrGap = Math.abs(ummAlQura.dhuhr - egyptian.dhuhr)
    expect(fajrGap).toBeGreaterThan(dhuhrGap)
  })

  it('applies the Shafi madhab to Asr for every method', () => {
    // Asserted against the binding directly rather than through a heuristic about where Asr falls
    // in the afternoon: Shafi and Hanafi Asr differ by well under an hour, so any "first half of
    // the window" rule of thumb is true in one season and false in another. The madhab is a locked
    // default (parity ledger §C), so it is pinned by construction.
    for (const method of CALCULATION_METHODS) {
      const coordinates = new Coordinates(CAIRO.latitude, CAIRO.longitude)
      const shafi = method.create()
      shafi.madhab = Madhab.Shafi
      const hanafi = method.create()
      hanafi.madhab = Madhab.Hanafi
      const asr = computeDayTimes(CAIRO, DAY, method.id).asr
      expect(asr).toBe(new PrayerTimes(coordinates, DAY, shafi).asr.getTime())
      expect(asr).not.toBe(new PrayerTimes(coordinates, DAY, hanafi).asr.getTime())
    }
  })

  it('falls back to the default method when the stored id is unknown', () => {
    // The id arrives from device storage, where a stale or hand-edited value must degrade rather
    // than throw.
    const unknown = computeDayTimes(CAIRO, DAY, 'not-a-method' as never)
    expect(unknown).toEqual(computeDayTimes(CAIRO, DAY, DEFAULT_METHOD_ID))
  })

  it('defaults to the Egyptian method', () => {
    expect(DEFAULT_METHOD_ID).toBe('egyptian')
    expect(computeDayTimes(CAIRO, DAY)).toEqual(computeDayTimes(CAIRO, DAY, 'egyptian'))
  })

  it('moves the day with the location', () => {
    // Same instant, a location far to the west: Dhuhr is solar noon, so it must be later.
    const west = computeDayTimes({ latitude: 30.0444, longitude: 0 }, DAY, 'egyptian')
    expect(west.dhuhr).toBeGreaterThan(computeDayTimes(CAIRO, DAY, 'egyptian').dhuhr)
  })
})

describe('isCalculationMethodId', () => {
  it('accepts every listed method and rejects anything else', () => {
    for (const method of CALCULATION_METHODS) {
      expect(isCalculationMethodId(method.id)).toBe(true)
    }
    for (const value of ['', 'EGYPTIAN', 'egypt', null, undefined, 3, {}]) {
      expect(isCalculationMethodId(value)).toBe(false)
    }
  })

  it('offers a unique id and an Arabic label for every method', () => {
    const ids = CALCULATION_METHODS.map((method) => method.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const method of CALCULATION_METHODS) {
      expect(method.label).toMatch(/[؀-ۿ]/)
    }
  })
})
