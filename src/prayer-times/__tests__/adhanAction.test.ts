import { buildAlarmPayloads } from '../logic'
import { MOMENT_LABELS, NOTIFICATION_COPY } from '../copy'
import type { WirdVersion } from '../../wird/types'

const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
const DAY = '2026-11-19'
const atLocal = (hour: number, minute = 0) => new Date(2026, 10, 19, hour, minute).getTime()

function version(
  id: string,
  effectiveFrom = '2026-11-01',
  itemIds: readonly string[] = PRAYERS,
): WirdVersion {
  return {
    id,
    effectiveFrom,
    createdAt: 1,
    definition: {
      areas: [],
      items: itemIds.map((itemId) => ({
        id: itemId,
        areaId: 'prayers',
        label: itemId,
        kind: 'checkbox',
      })),
    },
  }
}

function payloads(
  moments: { at: number; kind: 'before' | 'adhan' | 'iqamah' | 'adhkar'; prayerId: string }[],
  versions: WirdVersion[] = [version('v1')],
  scheduleDay = DAY,
) {
  return buildAlarmPayloads(moments, MOMENT_LABELS, NOTIFICATION_COPY, versions, scheduleDay)
}

describe('adhan action payloads', () => {
  it.each(PRAYERS)('maps %s adhan to the matching checklist item', (prayerId) => {
    const [alarm] = payloads([{ at: atLocal(12), kind: 'adhan', prayerId }])

    expect(alarm?.prayerAction).toEqual({
      itemId: prayerId,
      day: DAY,
      versionId: 'v1',
      actionId: `adhan:${DAY}:${prayerId}:v1`,
      label: `صلّيت ${MOMENT_LABELS[prayerId]}`,
    })
  })

  it.each(['before', 'iqamah', 'adhkar'] as const)(
    'does not attach an action to %s notifications',
    (kind) => {
      expect(
        payloads([{ at: atLocal(12), kind, prayerId: 'dhuhr' }])[0]?.prayerAction,
      ).toBeUndefined()
    },
  )

  it('assigns Fajr to the schedule day it opens', () => {
    const [alarm] = payloads([{ at: atLocal(5), kind: 'adhan', prayerId: 'fajr' }])

    expect(alarm?.prayerAction?.day).toBe(DAY)
  })

  it('keeps after-midnight Isha on the schedule day whose prayer times produced it', () => {
    const [alarm] = payloads([{ at: atLocal(2), kind: 'adhan', prayerId: 'isha' }])

    expect(alarm?.prayerAction?.day).toBe(DAY)
    expect(alarm?.prayerAction?.actionId).toBe(`adhan:${DAY}:isha:v1`)
  })

  it('selects each version effective on the action day across a multi-day schedule', () => {
    const versions = [version('v1', '2026-11-01'), version('v2', '2026-11-20')]
    const first = payloads([{ at: atLocal(12), kind: 'adhan', prayerId: 'dhuhr' }], versions)[0]
    const nextDay = '2026-11-20'
    const second = payloads(
      [{ at: new Date(2026, 10, 20, 12).getTime(), kind: 'adhan', prayerId: 'dhuhr' }],
      versions,
      nextDay,
    )[0]

    expect(first?.prayerAction?.versionId).toBe('v1')
    expect(second?.prayerAction?.versionId).toBe('v2')
  })

  it('omits an action when no version is effective on its day', () => {
    const [alarm] = payloads(
      [{ at: atLocal(12), kind: 'adhan', prayerId: 'fajr' }],
      [version('future', '2026-11-20')],
    )

    expect(alarm?.prayerAction).toBeUndefined()
  })

  it('omits an action when the selected definition does not contain the prayer item', () => {
    const [alarm] = payloads(
      [{ at: atLocal(12), kind: 'adhan', prayerId: 'isha' }],
      [version('v1', DAY, ['fajr', 'dhuhr', 'asr', 'maghrib'])],
    )

    expect(alarm?.prayerAction).toBeUndefined()
  })

  it('reproduces the same action id when the schedule is built twice', () => {
    const moment = [{ at: atLocal(12), kind: 'adhan' as const, prayerId: 'asr' }]

    const firstBuild = payloads(moment)[0]?.prayerAction?.actionId
    const secondBuild = payloads(moment)[0]?.prayerAction?.actionId

    expect(firstBuild).toBe(secondBuild)
  })
})
