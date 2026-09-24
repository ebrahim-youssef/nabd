import { deviceCopy } from './copy'
import type {
  DeviceNotificationSnapshot,
  ExactAlarmSnapshot,
  ExactAlarmStatus,
  LocationAction,
  LocationActionType,
  LocationCapabilitySnapshot,
  LocationStatus,
  NotificationAction,
  NotificationActionType,
  NotificationCapabilitySnapshot,
  NotificationEvaluation,
  NotificationSettingsSnapshot,
  NotificationStatus,
} from './types'

export { deviceCopy }
export type {
  ConnectivityState,
  CoordinateCacheState,
  GpsState,
  LocationAction,
  LocationActionType,
  LocationCapabilitySnapshot,
  LocationFixState,
  LocationPermission,
  LocationStatus,
  DeviceNotificationSnapshot,
  ExactAlarmAccess,
  ExactAlarmSnapshot,
  ExactAlarmStatus,
  NotificationAction,
  NotificationActionType,
  NotificationCapabilitySnapshot,
  NotificationEvaluation,
  NotificationPermission,
  NotificationSettingsSnapshot,
  NotificationStatus,
} from './types'

const actionLabels: Record<LocationActionType, string> = {
  'open-app-settings': deviceCopy.actions.openAppSettings,
  'open-location-settings': deviceCopy.actions.openLocationSettings,
  'retry-location': deviceCopy.actions.retryLocation,
}

const action = (type: LocationActionType): LocationAction => ({ type, label: actionLabels[type] })

const cacheStatus = (message: string, retry: boolean): LocationStatus => ({
  state: 'offline-cache',
  message,
  action: retry ? action('retry-location') : null,
})

const evaluateLocation = (location: LocationCapabilitySnapshot): LocationStatus => {
  if (location.permission === 'blocked') {
    return {
      state: 'settings-required',
      message: deviceCopy.location.settingsRequired,
      action: action('open-app-settings'),
    }
  }

  if (location.permission !== 'granted') {
    return {
      state: 'permission-required',
      message: deviceCopy.location.permissionRequired,
      action: action('retry-location'),
    }
  }

  if (location.gps === 'disabled') {
    return {
      state: 'gps-disabled',
      message: deviceCopy.location.gpsDisabled,
      action: action('open-location-settings'),
    }
  }

  if (location.gps === 'unknown') {
    return {
      state: 'unavailable',
      message: deviceCopy.location.unavailable,
      action: action('retry-location'),
    }
  }

  const fix = location.fix ?? 'ok'

  if (location.coordinateCache === 'missing') {
    const message =
      fix === 'timeout'
        ? deviceCopy.location.timeout
        : location.connectivity === 'offline'
          ? deviceCopy.location.noCache
          : deviceCopy.location.unavailable
    return {
      state: 'unavailable',
      message,
      action: action('retry-location'),
    }
  }

  if (fix === 'timeout' || fix === 'error') {
    return cacheStatus(
      fix === 'timeout' ? deviceCopy.location.timeoutCache : deviceCopy.location.unavailable,
      true,
    )
  }

  if (location.coordinateCache === 'stale' && location.connectivity === 'online') {
    return {
      state: 'unavailable',
      message: deviceCopy.location.stale,
      action: action('retry-location'),
    }
  }

  if (location.connectivity === 'online') {
    return {
      state: 'ready',
      message: deviceCopy.location.ready,
      action: null,
    }
  }

  const unknownConnectivity = location.connectivity === 'unknown'
  return cacheStatus(
    unknownConnectivity ? deviceCopy.location.unknownCache : deviceCopy.location.offlineCache,
    unknownConnectivity,
  )
}

export { evaluateLocation }

const notificationActionLabels: Record<NotificationActionType, string> = {
  'request-notification-permission': deviceCopy.actions.requestNotificationPermission,
  'enable-notifications': deviceCopy.actions.enableNotifications,
  'open-app-settings': deviceCopy.actions.openAppSettings,
  'open-exact-alarm-settings': deviceCopy.actions.openExactAlarmSettings,
}

const notificationAction = (type: NotificationActionType): NotificationAction => ({
  type,
  label: notificationActionLabels[type],
})

export function evaluateNotificationSettings(
  notifications: NotificationSettingsSnapshot,
): NotificationStatus {
  if (notifications.permission === 'blocked') {
    return {
      capability: 'notifications',
      state: 'settings-required',
      message: deviceCopy.notifications.settingsRequired,
      action: notificationAction('open-app-settings'),
    }
  }

  if (notifications.permission !== 'granted') {
    return {
      capability: 'notifications',
      state: 'permission-required',
      message: deviceCopy.notifications.permissionRequired,
      action: notificationAction('request-notification-permission'),
    }
  }

  if (!notifications.enabled) {
    return {
      capability: 'notifications',
      state: 'disabled',
      message: deviceCopy.notifications.disabled,
      action: notificationAction('enable-notifications'),
    }
  }

  if (notifications.deviceEnabled === false) {
    return {
      capability: 'notifications',
      state: 'settings-required',
      message: deviceCopy.notifications.deviceDisabled,
      action: notificationAction('open-app-settings'),
    }
  }

  return {
    capability: 'notifications',
    state: 'ready',
    message: deviceCopy.notifications.ready,
    action: null,
  }
}

export function evaluateExactAlarm(exactAlarm: ExactAlarmSnapshot): ExactAlarmStatus {
  if (exactAlarm.apiLevel < 31) {
    return {
      capability: 'exact-alarm',
      state: 'not-required',
      message: deviceCopy.exactAlarm.notRequired,
      action: null,
    }
  }

  if (exactAlarm.access === 'granted') {
    return {
      capability: 'exact-alarm',
      state: 'ready',
      message: deviceCopy.exactAlarm.ready,
      action: null,
    }
  }

  if (exactAlarm.apiLevel >= 33) {
    return {
      capability: 'exact-alarm',
      state: 'unavailable',
      message: deviceCopy.exactAlarm.unavailable,
      action: notificationAction('open-app-settings'),
    }
  }

  return {
    capability: 'exact-alarm',
    state: 'settings-required',
    message: deviceCopy.exactAlarm.settingsRequired,
    action: notificationAction('open-exact-alarm-settings'),
  }
}

export function evaluateNotifications(
  snapshot: NotificationCapabilitySnapshot | DeviceNotificationSnapshot,
): NotificationEvaluation {
  const notifications = 'notifications' in snapshot ? snapshot.notifications : snapshot
  const exactAlarm = snapshot.exactAlarm ?? { apiLevel: 30, access: 'not-required' }

  return {
    notifications: evaluateNotificationSettings(notifications),
    exactAlarm: evaluateExactAlarm(exactAlarm),
  }
}
