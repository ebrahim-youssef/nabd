import { logger } from '../logger'

import {
  DEFAULT_NOTIFICATION_PREFS,
  NOTIFICATION_PREFS_EVENT,
  NOTIFICATION_PREFS_KEY,
  parseNotificationPrefs,
} from './logic'
import type { NotificationPrefs } from './logic'

export function readNotificationPrefs(): NotificationPrefs {
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_PREFS_KEY)
    return raw === null ? DEFAULT_NOTIFICATION_PREFS : parseNotificationPrefs(JSON.parse(raw))
  } catch (error) {
    logger.warn('notifications.readNotificationPrefs: invalid stored preferences', { error })
    return DEFAULT_NOTIFICATION_PREFS
  }
}

export function writeNotificationPrefs(prefs: NotificationPrefs): void {
  try {
    window.localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs))
    window.dispatchEvent(new Event(NOTIFICATION_PREFS_EVENT))
  } catch (error) {
    logger.warn('notifications.writeNotificationPrefs: unable to persist preferences', { error })
  }
}
