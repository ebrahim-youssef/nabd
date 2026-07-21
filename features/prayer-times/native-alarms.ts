import { LocalNotifications } from '@capacitor/local-notifications'

import { logger } from '@/lib/logger'
import { computeDayTimes, readCalculationMethodId } from '@/lib/impure/prayer'
import type { Coords } from '@/lib/impure/location'
import type { NotificationPrefs } from '@/lib/impure/notifications'

import {
  ADHKAR_REMINDER_MINUTES,
  ALARM_CHANNELS,
  BEFORE_ADHAN_MINUTES,
  IQAMAH_OFFSET_MINUTES,
  MOMENT_LABELS,
  NATIVE_SCHEDULE_DAYS,
  NOTIFICATION_COPY,
} from './constants'
import { buildAlarmPayloads, notificationMoments } from './logic'

// Native alarm plumbing for the Android shell (NBD-46, ADR-0012). The channel carries the
// sound, so the adhan plays with the app fully closed; AlarmManager (`allowWhileIdle`)
// carries the exactness. Every arm re-schedules the whole window, which also covers Android
// dropping alarms on reboot — the next launch restores them.

const MS_PER_DAY = 86_400_000

let channelsReady = false

async function ensureChannels(): Promise<void> {
  if (channelsReady) return
  for (const channel of Object.values(ALARM_CHANNELS)) {
    await LocalNotifications.createChannel({
      id: channel.id,
      name: channel.name,
      importance: 5,
      sound: channel.sound,
      visibility: 1,
    })
  }
  channelsReady = true
}

// The next NATIVE_SCHEDULE_DAYS of moments across day boundaries, from the same pure math
// the web scheduler uses (picked calculation method included).
function upcomingMoments(coords: Coords, prefs: NotificationPrefs, now: number) {
  const methodId = readCalculationMethodId()
  return Array.from({ length: NATIVE_SCHEDULE_DAYS }, (_, offset) =>
    notificationMoments(
      { ...computeDayTimes(coords, new Date(now + offset * MS_PER_DAY), methodId) },
      IQAMAH_OFFSET_MINUTES,
      prefs,
      BEFORE_ADHAN_MINUTES,
      ADHKAR_REMINDER_MINUTES,
      now,
    ),
  ).flat()
}

// Arms the native alarm window. Cancels the previously scheduled set first so pref/method
// changes never leave stale alarms behind. Best-effort: a failure leaves the app usable and
// the next launch retries.
export async function armNativeAlarms(
  prefs: NotificationPrefs,
  coords: Coords,
  now: number,
): Promise<void> {
  try {
    const permission = await LocalNotifications.checkPermissions()
    if (permission.display !== 'granted') return

    await ensureChannels()

    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((notification) => ({ id: notification.id })),
      })
    }

    if (!prefs.enabled) return

    const payloads = buildAlarmPayloads(
      upcomingMoments(coords, prefs, now),
      MOMENT_LABELS,
      NOTIFICATION_COPY,
    )
    if (payloads.length === 0) return

    await LocalNotifications.schedule({
      notifications: payloads.map((payload) => ({
        id: payload.id,
        title: payload.title,
        body: payload.body,
        channelId: ALARM_CHANNELS[payload.channelKey].id,
        schedule: { at: new Date(payload.at), allowWhileIdle: true },
      })),
    })
  } catch (cause) {
    logger.error('prayer-times.armNativeAlarms failed', cause, {})
  }
}

// Native notification permission, called from a user gesture (onboarding). Returns the web
// PermissionState vocabulary so callers stay platform-agnostic.
export async function requestNativeNotificationPermission(): Promise<'granted' | 'denied'> {
  try {
    const result = await LocalNotifications.requestPermissions()
    return result.display === 'granted' ? 'granted' : 'denied'
  } catch (cause) {
    logger.error('prayer-times.requestNativeNotificationPermission failed', cause, {})
    return 'denied'
  }
}
