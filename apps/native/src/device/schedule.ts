import {
  ADHKAR_REMINDER_MINUTES,
  BEFORE_ADHAN_MINUTES,
  buildAlarmPayloads,
  computeDayTimes,
  IQAMAH_OFFSET_MINUTES,
  MOMENT_LABELS,
  NATIVE_SCHEDULE_DAYS,
  NOTIFICATION_COPY,
  notificationMoments,
  type AlarmPayload,
  type CalculationMethodId,
  type Coords,
  type DayPrayerTimes,
  type NotificationPrefs,
} from '@nabd/shared'

export type PrayerScheduleFrame = {
  date: Date
  times: DayPrayerTimes
  alarms: AlarmPayload[]
  boundaries: { at: number; label: string; sunrise?: boolean }[]
}

export type PrayerSchedule = {
  frames: PrayerScheduleFrame[]
  alarms: AlarmPayload[]
  boundaries: { at: number; label: string; sunrise?: boolean }[]
}

const PRAYER_IDS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
const MINIMUM_FRAME_COUNT = 1

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function prayerRecord(times: DayPrayerTimes): Record<string, number> {
  return Object.fromEntries(PRAYER_IDS.map((id) => [id, times[id]]))
}

function boundaries(times: DayPrayerTimes): PrayerScheduleFrame['boundaries'] {
  return PRAYER_IDS.map((id) => ({
    at: times[id],
    label: MOMENT_LABELS[id],
    ...(id === 'sunrise' ? { sunrise: true } : {}),
  }))
}

export function buildPrayerSchedule({
  coords,
  methodId,
  notificationPrefs,
  now,
  startDate = new Date(now),
  days = NATIVE_SCHEDULE_DAYS,
}: {
  coords: Coords
  methodId: CalculationMethodId
  notificationPrefs: NotificationPrefs
  now: number
  startDate?: Date
  days?: number
}): PrayerSchedule {
  const frames: PrayerScheduleFrame[] = []

  for (let index = 0; index < Math.max(MINIMUM_FRAME_COUNT, days); index += 1) {
    const date = addDays(startDate, index)
    const times = computeDayTimes(coords, date, methodId)
    const moments = notificationMoments(
      prayerRecord(times),
      IQAMAH_OFFSET_MINUTES,
      notificationPrefs,
      BEFORE_ADHAN_MINUTES,
      ADHKAR_REMINDER_MINUTES,
      now,
    )
    const alarms = buildAlarmPayloads(moments, MOMENT_LABELS, NOTIFICATION_COPY)
    const futureBoundaries = boundaries(times).filter((boundary) => boundary.at > now)
    frames.push({ date, times, alarms, boundaries: futureBoundaries })
  }

  return {
    frames,
    alarms: frames.flatMap((frame) => frame.alarms).filter((alarm) => alarm.at > now),
    boundaries: frames.flatMap((frame) => frame.boundaries).filter((boundary) => boundary.at > now),
  }
}
