import { DEFAULT_NOTIFICATION_PREFS, toDayId } from '@nabd/shared'

import { buildPrayerSchedule } from '../schedule'

const coords = { latitude: 30.0444, longitude: 31.2357 }
const now = new Date('2026-09-20T00:00:00.000Z').getTime()
const DAY_MS = 86_400_000

describe('buildPrayerSchedule', () => {
  it('builds a three-day future alarm window from shared prayer times and moments', () => {
    const alarms = buildPrayerSchedule({
      coords,
      methodId: 'egyptian',
      notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS, enabled: true },
      now,
    })
    const thirdDay = toDayId(new Date(now + 2 * DAY_MS))

    expect(alarms.length).toBeGreaterThan(0)
    expect(alarms.every((alarm) => alarm.at > now)).toBe(true)
    expect(alarms.some((alarm) => toDayId(new Date(alarm.at)) === thirdDay)).toBe(true)
    expect(alarms.some((alarm) => alarm.channelKey === 'adhanFajr')).toBe(true)
    expect(alarms.some((alarm) => alarm.channelKey === 'iqamah')).toBe(true)
  })

  it('excludes disabled moments and never emits stale alarms', () => {
    const disabledPrefs = {
      ...DEFAULT_NOTIFICATION_PREFS,
      enabled: true,
      beforeAdhan: false,
      atIqamah: false,
      morningAdhkar: false,
      eveningAdhkar: false,
    }
    const lateNow = new Date('2026-09-20T23:59:59.000Z').getTime()
    const alarms = buildPrayerSchedule({
      coords,
      methodId: 'egyptian',
      notificationPrefs: disabledPrefs,
      now: lateNow,
    })

    expect(
      alarms.every((alarm) => alarm.channelKey === 'adhan' || alarm.channelKey === 'adhanFajr'),
    ).toBe(true)
    expect(alarms.every((alarm) => alarm.at > lateNow)).toBe(true)
  })
})
