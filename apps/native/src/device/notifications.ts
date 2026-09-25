import type { AlarmPayload } from '@nabd/shared'
import * as Notifications from 'expo-notifications'
import type { NotificationRequest, NotificationRequestInput } from 'expo-notifications'

import { logger } from '../observability/logger'
import { mapDevicePermission } from './logic'
import { channelFor, ensureChannels } from './notificationChannels'
import type { NotificationPermission } from './types'

type AndroidDateTrigger = {
  type: 'date'
  value: number
  channelId?: string | null
}

const PRAYER_NOTIFICATION_PREFIX = 'nabd-prayer-'

type ScheduledIdentifier = Pick<NotificationRequest, 'identifier'>

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

function notificationForAlarm(alarm: AlarmPayload, silentMode: boolean): NotificationRequestInput {
  return {
    identifier: `${PRAYER_NOTIFICATION_PREFIX}${alarm.id}`,
    content: {
      title: alarm.title,
      body: alarm.body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: alarm.at,
      channelId: channelFor(alarm.channelKey, silentMode),
    },
  }
}

async function cancelRequests(requests: ScheduledIdentifier[], operation: string): Promise<void> {
  let firstFailure: unknown
  let failed = false
  for (const request of requests) {
    if (!isPrayerNotification(request)) continue
    try {
      await Notifications.cancelScheduledNotificationAsync(request.identifier)
    } catch (cause: unknown) {
      if (!failed) firstFailure = cause
      failed = true
      logger.error('Native prayer notification cancellation failed', cause, {
        operation,
        identifier: request.identifier,
      })
    }
  }
  if (failed) throw firstFailure
}

function isAndroidDateTrigger(trigger: unknown): trigger is AndroidDateTrigger {
  if (typeof trigger !== 'object' || trigger === null || !('type' in trigger)) return false
  if (trigger.type !== 'date') return false
  if (!('value' in trigger) || typeof trigger.value !== 'number') return false
  if (!Number.isFinite(trigger.value)) return false
  if (
    'channelId' in trigger &&
    trigger.channelId !== null &&
    trigger.channelId !== undefined &&
    typeof trigger.channelId !== 'string'
  ) {
    return false
  }
  return true
}

function restoreRequest(
  request: NotificationRequest,
  operation: string,
  now: number,
): NotificationRequestInput | null {
  if (!isAndroidDateTrigger(request.trigger)) {
    logger.warn('Native prayer notification rollback skipped an unsupported trigger', {
      operation,
      identifier: request.identifier,
    })
    return null
  }
  if (request.trigger.value <= now) {
    logger.warn('Native prayer notification rollback skipped a past trigger', {
      operation,
      identifier: request.identifier,
      value: request.trigger.value,
      now,
    })
    return null
  }
  return {
    identifier: request.identifier,
    content: {
      title: request.content.title,
      body: request.content.body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: request.trigger.value,
      channelId: request.trigger.channelId ?? undefined,
    },
  }
}

async function restoreRequests(
  requests: NotificationRequest[],
  operation: string,
  now: number,
): Promise<void> {
  for (const request of requests) {
    const restored = restoreRequest(request, operation, now)
    if (!restored) continue
    try {
      await Notifications.scheduleNotificationAsync(restored)
    } catch (cause: unknown) {
      logger.error('Native prayer notification rollback failed', cause, {
        operation,
        identifier: request.identifier,
      })
    }
  }
}

export async function replacePrayerAlarms(
  alarms: AlarmPayload[],
  silentMode: boolean,
  now: number,
): Promise<void> {
  await ensureChannels()
  const snapshot = (await Notifications.getAllScheduledNotificationsAsync()).filter(
    isPrayerNotification,
  )
  const scheduled = new Set<string>()
  let failure: unknown
  let failed = false

  try {
    await cancelRequests(snapshot, 'replace-cancel-snapshot')

    for (const alarm of alarms) {
      if (alarm.at <= now) continue
      const identifier = `${PRAYER_NOTIFICATION_PREFIX}${alarm.id}`
      await Notifications.scheduleNotificationAsync(notificationForAlarm(alarm, silentMode))
      scheduled.add(identifier)
    }
  } catch (cause: unknown) {
    failure = cause
    failed = true
  }

  if (!failed) return

  try {
    await cancelRequests(
      [...scheduled].map((identifier) => ({ identifier })),
      'replace-rollback-cancel',
    )
  } catch (rollbackCause: unknown) {
    logger.warn('Native prayer notification rollback cancellation failed', {
      operation: 'replace-rollback-cancel',
      error: rollbackCause,
    })
  }
  await restoreRequests(snapshot, 'replace-rollback-restore', now)
  throw failure
}

export async function cancelPrayerAlarms(): Promise<void> {
  const snapshot = (await Notifications.getAllScheduledNotificationsAsync()).filter(
    isPrayerNotification,
  )
  await cancelRequests(snapshot, 'cancel-prayer-alarms')
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
