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
  type NotificationPrefs,
} from '@nabd/shared'

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function buildPrayerSchedule({
  coords,
  methodId,
  notificationPrefs,
  now,
}: {
  coords: Coords
  methodId: CalculationMethodId
  notificationPrefs: NotificationPrefs
  now: number
}): AlarmPayload[] {
  const alarms: AlarmPayload[] = []
  const startDate = new Date(now)

  for (let index = 0; index < NATIVE_SCHEDULE_DAYS; index += 1) {
    const date = addDays(startDate, index)
    const times = computeDayTimes(coords, date, methodId)
    const moments = notificationMoments(
      times,
      IQAMAH_OFFSET_MINUTES,
      notificationPrefs,
      BEFORE_ADHAN_MINUTES,
      ADHKAR_REMINDER_MINUTES,
      now,
    )
    alarms.push(...buildAlarmPayloads(moments, MOMENT_LABELS, NOTIFICATION_COPY))
  }

  return alarms
}
