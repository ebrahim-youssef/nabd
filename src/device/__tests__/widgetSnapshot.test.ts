import { WIRD_LEVELS } from '../../content/levels'
import type { DayPrayerTimes } from '../../prayer-times/logic'
import { buildWidgetSnapshot } from '../widgetSnapshot'

const DAY = '2026-06-10'
const TIMES: DayPrayerTimes = {
  fajr: Date.parse('2026-06-10T04:00:00+03:00'),
  sunrise: Date.parse('2026-06-10T05:30:00+03:00'),
  dhuhr: Date.parse('2026-06-10T12:00:00+03:00'),
  asr: Date.parse('2026-06-10T15:30:00+03:00'),
  maghrib: Date.parse('2026-06-10T18:30:00+03:00'),
  isha: Date.parse('2026-06-10T20:00:00+03:00'),
}
const NEXT_FAJR = Date.parse('2026-06-11T04:00:00+03:00')
const DEFINITION = WIRD_LEVELS[2].wird

describe('buildWidgetSnapshot', () => {
  it.each([
    ['05:10', Date.parse('2026-06-10T05:10:00+03:00'), 'fajr', 'dhuhr'],
    ['13:05', Date.parse('2026-06-10T13:05:00+03:00'), 'dhuhr', 'asr'],
    ['23:40', Date.parse('2026-06-10T23:40:00+03:00'), 'isha', 'fajr'],
  ])('builds the %s prayer block and remaining prayers', (_label, now, blockId, nextPrayerId) => {
    const snapshot = buildWidgetSnapshot({
      now: now as number,
      day: DAY,
      versionId: 'v1',
      times: TIMES,
      nextFajr: NEXT_FAJR,
      definition: DEFINITION,
      entries: [],
    })

    expect(snapshot?.blocks.find(({ id }) => id === blockId)?.items.length).toBeLessThanOrEqual(3)
    expect(snapshot?.blocks.find(({ id }) => id === blockId)?.items[0].label).toBeTruthy()
    expect(snapshot?.nextPrayers[0]?.id).toBe(nextPrayerId)
    expect(snapshot?.writeFailed).toBe(false)
  })

  it('uses Friday plan labels and the unrecorded count', () => {
    const snapshot = buildWidgetSnapshot({
      now: Date.parse('2026-06-12T13:05:00+03:00'),
      day: '2026-06-12',
      versionId: 'v2',
      times: TIMES,
      nextFajr: NEXT_FAJR,
      definition: DEFINITION,
      entries: [],
    })

    expect(snapshot?.blocks.find(({ id }) => id === 'dhuhr')?.label).toBe('الجمعة / الظهر')
    expect(snapshot?.unrecordedCount).toBeGreaterThan(0)
  })

  it('returns null when prayer times are unavailable', () => {
    expect(
      buildWidgetSnapshot({
        now: Date.parse('2026-06-10T13:05:00+03:00'),
        day: DAY,
        versionId: 'v1',
        times: null,
        nextFajr: null,
        definition: DEFINITION,
        entries: [],
      }),
    ).toBeNull()
  })
})
