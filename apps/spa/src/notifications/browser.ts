import { logger } from '../logger'

export type BrowserNotificationPermission = 'default' | 'denied' | 'granted' | 'unsupported'

export function supportsBrowserNotifications(): boolean {
  return window.isSecureContext && 'Notification' in window
}

export function browserNotificationPermission(): BrowserNotificationPermission {
  return supportsBrowserNotifications() ? window.Notification.permission : 'unsupported'
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  const permission = browserNotificationPermission()
  if (permission !== 'default') return permission
  try {
    return await window.Notification.requestPermission()
  } catch (error) {
    logger.warn('notifications.requestBrowserNotificationPermission: request failed', { error })
    return 'denied'
  }
}

export function showBrowserNotification(title: string, body: string): void {
  if (browserNotificationPermission() !== 'granted') return
  try {
    new window.Notification(title, { body, dir: 'rtl', lang: 'ar' })
  } catch (error) {
    logger.warn('notifications.showBrowserNotification: delivery failed', { error })
  }
}
