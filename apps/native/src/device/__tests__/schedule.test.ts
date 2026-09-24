import { DEFAULT_NOTIFICATION_PREFS } from '@nabd/shared'

import { buildPrayerSchedule } from '../schedule'

const coords = { latitude: 30.0444, longitude: 31.2357 }
const now = new Date('2026-09-20T00:00:00.000Z').getTime()

describe('buildPrayerSchedule', () => {
  it('builds a three-day future window from shared prayer times and moments', () => {
    const schedule = buildPrayerSchedule({
      coords,
      methodId: 'egyptian',
      notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS, enabled: true },
      now,
    })

    expect(schedule.frames).toHaveLength(3)
    expect(schedule.alarms.length).toBeGreaterThan(0)
    expect(schedule.alarms.every((alarm) => alarm.at > now)).toBe(true)
    expect(schedule.frames.every((frame) => frame.alarms.every((alarm) => alarm.at > now))).toBe(
      true,
    )
    expect(
      schedule.frames.every((frame) => frame.boundaries.every((boundary) => boundary.at > now)),
    ).toBe(true)
    expect(schedule.alarms.some((alarm) => alarm.channelKey === 'adhanFajr')).toBe(true)
    expect(schedule.alarms.some((alarm) => alarm.channelKey === 'iqamah')).toBe(true)
    expect(schedule.boundaries.some((boundary) => boundary.sunrise === true)).toBe(true)
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
    const schedule = buildPrayerSchedule({
      coords,
      methodId: 'egyptian',
      notificationPrefs: disabledPrefs,
      now: lateNow,
    })

    expect(
      schedule.alarms.every(
        (alarm) => alarm.channelKey === 'adhan' || alarm.channelKey === 'adhanFajr',
      ),
    ).toBe(true)
    expect(schedule.alarms.every((alarm) => alarm.at > lateNow)).toBe(true)
  })
})
