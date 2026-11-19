import { WIRD_LEVELS } from '../../content/levels'
import { buildDayPlan } from '../../day-plan/logic'
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

  it('marks required items after their window ends, whether done or not', () => {
    const now = Date.parse('2026-06-10T13:05:00+03:00')
    const baseInput = {
      now,
      day: DAY,
      versionId: 'v1',
      times: TIMES,
      nextFajr: NEXT_FAJR,
      definition: DEFINITION,
      entries: [],
    }
    const initialPlan = buildDayPlan(baseInput)
    const endedRequiredItems =
      initialPlan.blocks
        .find(({ id }) => id === 'fajr')
        ?.items.filter(({ optional }) => !optional) ?? []
    const completedEndedItemId = endedRequiredItems[0]?.id
    const incompleteEndedItemId = endedRequiredItems[1]?.id
    if (!completedEndedItemId || !incompleteEndedItemId) {
      throw new Error('Expected at least two required Fajr items for the ended-window fixture')
    }
    const input = {
      ...baseInput,
      entries: [
        {
          id: 'completed-ended-item',
          day: DAY,
          versionId: 'v1',
          itemId: completedEndedItemId,
          done: true,
          at: now,
        },
      ],
    }
    const plan = buildDayPlan(input)
    const snapshot = buildWidgetSnapshot(input)
    const openRequiredItem = plan.blocks
      .find(({ id }) => id === 'dhuhr')
      ?.items.filter(({ optional }) => !optional)?.[0]
    if (!openRequiredItem) throw new Error('Expected a required item in the open Dhuhr window')

    const findSnapshotItem = (itemId: string) =>
      snapshot?.blocks.flatMap(({ items }) => items).find(({ id }) => id === itemId)

    expect(findSnapshotItem(openRequiredItem.id)?.countsAsUnrecorded).toBe(false)
    expect(findSnapshotItem(completedEndedItemId)).toMatchObject({
      done: true,
      countsAsUnrecorded: true,
    })
    expect(findSnapshotItem(incompleteEndedItemId)).toMatchObject({
      done: false,
      countsAsUnrecorded: true,
    })
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
