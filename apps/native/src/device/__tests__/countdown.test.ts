import type { CalculationMethodId } from '../../prayer-times/logic'
import type { Coords } from '../types'

import { boundaries, currentCountdown, type CountdownBoundary } from '../countdown'

const COORDINATES: Coords = { latitude: 30.0444, longitude: 31.2357 }
const METHOD: CalculationMethodId = 'egyptian'
const MINUTE_MS = 60_000

function point(overrides: Partial<CountdownBoundary>): CountdownBoundary {
  return {
    id: 'fajr',
    label: 'الفجر',
    at: 1_000_000,
    sunrise: false,
    ...overrides,
  }
}

describe('countdown state', () => {
  it('keeps a point at 29:59 in since state and switches at exactly 30 minutes', () => {
    const now = 1_000_000
    const next = point({ id: 'dhuhr', label: 'الظهر', at: now + 10 * MINUTE_MS })

    expect(
      currentCountdown([point({ at: now - 30 * MINUTE_MS + 1_000 }), next], now),
    ).toMatchObject({
      kind: 'since',
      text: 'أذّن الفجر منذ ٢٩ دقيقة',
    })
    expect(currentCountdown([point({ at: now - 30 * MINUTE_MS }), next], now)).toMatchObject({
      kind: 'until',
      text: 'باقي ١٠ دقيقة على الظهر',
    })
  })

  it('uses the distinct sunrise copy', () => {
    expect(
      currentCountdown(
        [point({ id: 'sunrise', label: 'الشروق', at: 1_000_000 - 2 * MINUTE_MS, sunrise: true })],
        1_000_000,
      ),
    ).toMatchObject({ kind: 'since', text: 'الشروق منذ ٢ دقيقة' })
  })

  it('returns no countdown after the last isha boundary', () => {
    expect(
      currentCountdown(
        [point({ id: 'isha', label: 'العشاء', at: 1_000_000 - 31 * MINUTE_MS })],
        1_000_000,
      ),
    ).toBeNull()
  })

  it('returns no countdown for empty input', () => {
    expect(currentCountdown([], 1_000_000)).toBeNull()
  })
})

describe('countdown boundaries', () => {
  it('calculates a month of boundaries by local calendar date across spring-forward', () => {
    const originalTimeZone = process.env.TZ
    process.env.TZ = 'America/New_York'
    try {
      const now = new Date('2027-03-13T12:00:00-05:00').getTime()
      const result = boundaries(now, COORDINATES, METHOD)
      const dates = [
        ...new Set(result.map((boundary) => new Date(boundary.at).toLocaleDateString('en-CA'))),
      ]

      expect(dates).toHaveLength(30)
      expect(dates.slice(0, 3)).toEqual(['2027-03-13', '2027-03-14', '2027-03-15'])
      expect(new Date(result[6].at).getTime() - new Date(result[0].at).getTime()).not.toBe(
        24 * 60 * 60 * 1000,
      )
    } finally {
      if (originalTimeZone === undefined) delete process.env.TZ
      else process.env.TZ = originalTimeZone
    }
  })
})
