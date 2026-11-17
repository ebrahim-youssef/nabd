import { requireOptionalNativeModule } from 'expo'
import type { AlarmPayload } from '../prayer-times/logic'
import * as Notifications from 'expo-notifications'
import type { NotificationRequest } from 'expo-notifications'

import { logger } from '../observability/logger'
import { mapDevicePermission } from './logic'
import { channelFor, soundFor } from './notificationChannels'
import type { NotificationPermission } from './types'

const PRAYER_NOTIFICATION_PREFIX = 'nabd-prayer-'
const NATIVE_MODULE_NAME = 'NabdDevice'
// Must match SNAPSHOT_VERSION in PrayerAlarmSnapshot.kt.
const NATIVE_SNAPSHOT_VERSION = 1

type ScheduledIdentifier = Pick<NotificationRequest, 'identifier'>

type NativePrayerAlarmModule = {
  replacePrayerAlarms: (snapshotJson: string) => unknown
  cancelPrayerAlarms: () => unknown
}

export class ExactAlarmDeniedError extends Error {
  constructor() {
    super('Prayer alarms could not be scheduled because exact alarm access is denied')
    this.name = 'ExactAlarmDeniedError'
  }
}

let foregroundHandlerConfigured = false

export async function readNotificationPermission(): Promise<NotificationPermission> {
  return mapDevicePermission(await Notifications.getPermissionsAsync())
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  return mapDevicePermission(
    await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowSound: true,
      },
    }),
  )
}

function isPrayerNotification(request: ScheduledIdentifier): boolean {
  return request.identifier.startsWith(PRAYER_NOTIFICATION_PREFIX)
}

async function migrateScheduledNotifications(): Promise<void> {
  let requests: NotificationRequest[]
  try {
    requests = await Notifications.getAllScheduledNotificationsAsync()
  } catch (cause: unknown) {
    logger.warn('Expo prayer notification migration could not list scheduled requests', {
      operation: 'migrate-scheduled-prayer-notifications',
      error: cause,
    })
    throw new Error(
      'Expo prayer notification migration could not list scheduled prayer notifications',
    )
  }

  for (const request of requests) {
    if (!isPrayerNotification(request)) continue
    try {
      await Notifications.cancelScheduledNotificationAsync(request.identifier)
    } catch (cause: unknown) {
      logger.warn('Expo prayer notification migration could not cancel a scheduled request', {
        operation: 'migrate-scheduled-prayer-notifications',
        identifier: request.identifier,
        error: cause,
      })
      throw new Error(
        `Expo prayer notification migration could not cancel scheduled prayer notification ${request.identifier}`,
      )
    }
  }
}

async function migratePresentedNotifications(): Promise<void> {
  try {
    const notifications = await Notifications.getPresentedNotificationsAsync()
    for (const notification of notifications) {
      if (!isPrayerNotification(notification.request)) continue
      try {
        await Notifications.dismissNotificationAsync(notification.request.identifier)
      } catch (cause: unknown) {
        logger.warn('Expo prayer notification migration could not dismiss a presented request', {
          operation: 'migrate-presented-prayer-notifications',
          identifier: notification.request.identifier,
          error: cause,
        })
      }
    }
  } catch (cause: unknown) {
    logger.warn('Expo prayer notification migration could not list presented requests', {
      operation: 'migrate-presented-prayer-notifications',
      error: cause,
    })
  }
}

async function migrateExpoPrayerNotifications(): Promise<void> {
  await Promise.all([migrateScheduledNotifications(), migratePresentedNotifications()])
}

function nativeModule(): NativePrayerAlarmModule | null {
  return requireOptionalNativeModule<NativePrayerAlarmModule>(NATIVE_MODULE_NAME)
}

function nativeReplaceResult(result: unknown): void {
  if (result === 'scheduled') return
  if (result === 'exact-denied') {
    throw new ExactAlarmDeniedError()
  }
  if (result === 'invalid') {
    throw new Error(
      'Prayer alarms could not be scheduled because the native prayer alarm snapshot is invalid',
    )
  }
  throw new Error('Prayer alarms could not be scheduled because the native result was invalid')
}

function alarmSnapshot(alarms: AlarmPayload[], silentMode: boolean, now: number): string {
  return JSON.stringify({
    version: NATIVE_SNAPSHOT_VERSION,
    alarms: alarms
      .filter((alarm) => alarm.at > now)
      .map((alarm) => ({
        id: String(alarm.id),
        at: alarm.at,
        title: alarm.title,
        body: alarm.body,
        sound: soundFor(alarm.channelKey),
        channelId: channelFor(alarm.channelKey, silentMode),
        isAlarmChannel: silentMode,
      })),
  })
}

export async function replacePrayerAlarms(
  alarms: AlarmPayload[],
  silentMode: boolean,
  now: number,
): Promise<void> {
  await migrateExpoPrayerNotifications()
  const native = nativeModule()
  if (!native) throw new Error('The native prayer alarm module is unavailable')
  nativeReplaceResult(native.replacePrayerAlarms(alarmSnapshot(alarms, silentMode, now)))
}

export async function cancelPrayerAlarms(): Promise<void> {
  const native = nativeModule()
  let firstError: unknown
  let hasError = false

  if (!native) {
    firstError = new Error('The native prayer alarm module is unavailable')
    hasError = true
  } else {
    try {
      await native.cancelPrayerAlarms()
    } catch (cause: unknown) {
      firstError = cause
      hasError = true
    }
  }

  try {
    await migrateExpoPrayerNotifications()
  } catch (cause: unknown) {
    if (!hasError) {
      firstError = cause
      hasError = true
    }
  }

  if (hasError) throw firstError
}

export function configureForegroundHandler(): void {
  if (foregroundHandlerConfigured) return
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })
  foregroundHandlerConfigured = true
}
