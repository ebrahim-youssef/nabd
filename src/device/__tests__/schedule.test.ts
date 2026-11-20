import { toDayId } from '../../lib/day'
import { DEFAULT_NOTIFICATION_PREFS } from '../logic'
import * as prayerTimesLogic from '../../prayer-times/logic'

import { buildPrayerSchedule } from '../schedule'
import type { WirdVersion } from '../../wird/types'

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

  it('uses the version in force for each day in the multi-day schedule', () => {
    const dayNow = new Date(2026, 10, 19, 0).getTime()
    const definition = {
      areas: [],
      items: [{ id: 'dhuhr', areaId: 'prayers', label: 'الظهر', kind: 'checkbox' as const }],
    }
    const versions: WirdVersion[] = [
      { id: 'v1', effectiveFrom: '2026-11-19', definition, createdAt: 1 },
      { id: 'v2', effectiveFrom: '2026-11-20', definition, createdAt: 2 },
    ]
    const alarms = buildPrayerSchedule({
      coords,
      methodId: 'egyptian',
      notificationPrefs: {
        ...DEFAULT_NOTIFICATION_PREFS,
        enabled: true,
        beforeAdhan: false,
        atAdhan: true,
        atIqamah: false,
        morningAdhkar: false,
        eveningAdhkar: false,
      },
      now: dayNow,
      versions,
    })

    expect(
      alarms
        .filter((alarm) => alarm.prayerAction?.itemId === 'dhuhr')
        .map((alarm) => [alarm.prayerAction?.day, alarm.prayerAction?.versionId]),
    ).toContainEqual(['2026-11-19', 'v1'])
    expect(
      alarms
        .filter((alarm) => alarm.prayerAction?.itemId === 'dhuhr')
        .map((alarm) => [alarm.prayerAction?.day, alarm.prayerAction?.versionId]),
    ).toContainEqual(['2026-11-20', 'v2'])
  })

  it('keeps an after-midnight Isha adhan on the schedule day that produced its prayer times', () => {
    const computeTimes = jest
      .spyOn(prayerTimesLogic, 'computeDayTimes')
      .mockImplementation((_coords, date) => {
        const atHour = (hour: number) => {
          const instant = new Date(date)
          instant.setHours(hour, 0, 0, 0)
          return instant.getTime()
        }
        return {
          fajr: atHour(5),
          sunrise: atHour(6),
          dhuhr: atHour(12),
          asr: atHour(15),
          maghrib: atHour(18),
          isha: atHour(25),
        }
      })
    const day = new Date(2026, 10, 19)
    const scheduleDay = toDayId(day)
    const definition = {
      areas: [],
      items: [{ id: 'isha', areaId: 'prayers', label: 'العشاء', kind: 'checkbox' as const }],
    }
    const alarms = buildPrayerSchedule({
      coords,
      methodId: 'egyptian',
      notificationPrefs: {
        ...DEFAULT_NOTIFICATION_PREFS,
        enabled: true,
        beforeAdhan: false,
        atAdhan: true,
        atIqamah: false,
        morningAdhkar: false,
        eveningAdhkar: false,
      },
      now: day.getTime(),
      versions: [{ id: 'v1', effectiveFrom: scheduleDay, definition, createdAt: 1 }],
    })
    const ishaAlarm = alarms.find((alarm) => alarm.prayerAction?.itemId === 'isha')

    expect(ishaAlarm?.at).toBe(new Date(2026, 10, 20, 1).getTime())
    expect(ishaAlarm?.prayerAction?.day).toBe(scheduleDay)
    computeTimes.mockRestore()
  })
})
