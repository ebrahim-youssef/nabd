import { LocalNotifications } from '@capacitor/local-notifications'

import { logger } from '@/lib/logger'
import { computeDayTimes, readCalculationMethodId } from '@/lib/impure/prayer'
import type { Coords } from '@/lib/impure/location'
import type { NotificationPrefs } from '@/lib/impure/notifications'

import {
  ALARM_CHANNELS,
  BEFORE_ADHAN_MINUTES,
  IQAMAH_OFFSET_MINUTES,
  NATIVE_SCHEDULE_DAYS,
  NOTIFICATION_COPY,
  PRAYER_LABELS,
} from './constants'
import { buildAlarmPayloads, notificationMoments } from './logic'

// Native alarm plumbing for the Android shell (NBD-46, ADR-0012). The channel carries the
// sound, so the adhan plays with the app fully closed; AlarmManager (`allowWhileIdle`)
// carries the exactness. Every arm re-schedules the whole window, which also covers Android
// dropping alarms on reboot — the next launch restores them.

const MS_PER_DAY = 86_400_000

// A high, fixed id kept clear of the scheduled prayer-window ids so a test never collides with,
// or is mistaken for, a real alarm (NBD-49). Lives up here because armNativeAlarms must spare it
// when it clears the window — otherwise the 15-minute replan would silently eat a pending test.
const DEBUG_ALARM_ID = 990_099

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

    // Clear the previous window but spare a pending debug test alarm (NBD-49) — the periodic
    // replan must not swallow it before it fires.
    const pending = await LocalNotifications.getPending()
    const stale = pending.notifications.filter((notification) => notification.id !== DEBUG_ALARM_ID)
    if (stale.length > 0) {
      await LocalNotifications.cancel({
        notifications: stale.map((notification) => ({ id: notification.id })),
      })
    }

    if (!prefs.enabled) return

    const payloads = buildAlarmPayloads(
      upcomingMoments(coords, prefs, now),
      PRAYER_LABELS,
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

// --- Debug tooling (NBD-49, r6 §7) — TEMPORARY. Lets the owner confirm the native alarm
// actually fires (with its adhan sound) without waiting for a real prayer, and inspect what is
// scheduled. Remove once alarms are verified on-device (DEBUG_ALARM_ID sits above with the
// module constants because armNativeAlarms references it). ---

export type PendingAlarm = { id: number; title: string; at: string | null }

// Schedules a one-off test notification on the adhan channel at `at` (epoch ms), requesting the
// notification permission if needed. Returns false on denial/failure so the UI can say so.
export async function scheduleTestAlarm(at: number): Promise<boolean> {
  try {
    let permission = await LocalNotifications.checkPermissions()
    if (permission.display !== 'granted') {
      permission = await LocalNotifications.requestPermissions()
      if (permission.display !== 'granted') return false
    }
    await ensureChannels()
    await LocalNotifications.schedule({
      notifications: [
        {
          id: DEBUG_ALARM_ID,
          title: 'تجربة الأذان',
          body: 'إشعار تجريبي للتأكد من عمل المنبّه — يُفترض أن يصدر صوت الأذان.',
          channelId: ALARM_CHANNELS.adhan.id,
          schedule: { at: new Date(at), allowWhileIdle: true },
        },
      ],
    })
    return true
  } catch (cause) {
    logger.error('prayer-times.scheduleTestAlarm failed', cause, { at })
    return false
  }
}

// The currently scheduled native alarms (prayer window + any debug test), for the debug panel.
// Empty on web / failure.
export async function listPendingAlarms(): Promise<PendingAlarm[]> {
  try {
    const pending = await LocalNotifications.getPending()
    return pending.notifications.map((notification) => {
      const at = notification.schedule?.at
      return {
        id: notification.id,
        title: notification.title ?? '',
        at: at ? new Date(at).toISOString() : null,
      }
    })
  } catch (cause) {
    logger.error('prayer-times.listPendingAlarms failed', cause, {})
    return []
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
