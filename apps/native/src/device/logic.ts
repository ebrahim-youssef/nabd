import { deviceCopy } from './copy'
import type {
  DevicePermission,
  ExactAlarmSnapshot,
  ExactAlarmStatus,
  LocationAction,
  LocationActionType,
  LocationCapabilitySnapshot,
  LocationStatus,
  NotificationAction,
  NotificationActionType,
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
  ExactAlarmAccess,
  ExactAlarmSnapshot,
  ExactAlarmStatus,
  NotificationAction,
  NotificationActionType,
  NotificationPermission,
  NotificationSettingsSnapshot,
  NotificationStatus,
} from './types'

type DevicePermissionResponse = {
  status: string
  canAskAgain: boolean
}

export function mapDevicePermission(response: DevicePermissionResponse): DevicePermission {
  if (response.status === 'granted') return 'granted'
  if (response.status === 'undetermined') return 'undetermined'
  return response.canAskAgain ? 'denied' : 'blocked'
}

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
      state: 'settings-required',
      message: deviceCopy.notifications.settingsRequired,
      action: notificationAction('open-app-settings'),
    }
  }

  if (notifications.permission !== 'granted') {
    return {
      state: 'permission-required',
      message: deviceCopy.notifications.permissionRequired,
      action: notificationAction('request-notification-permission'),
    }
  }

  if (!notifications.enabled) {
    return {
      state: 'disabled',
      message: deviceCopy.notifications.disabled,
      action: notificationAction('enable-notifications'),
    }
  }

  return {
    state: 'ready',
    message: deviceCopy.notifications.ready,
    action: null,
  }
}

export function evaluateExactAlarm(exactAlarm: ExactAlarmSnapshot): ExactAlarmStatus {
  if (exactAlarm.apiLevel < 31) {
    return {
      state: 'not-required',
      message: deviceCopy.exactAlarm.notRequired,
      action: null,
    }
  }

  if (exactAlarm.access === 'granted') {
    return {
      state: 'ready',
      message: deviceCopy.exactAlarm.ready,
      action: null,
    }
  }

  if (exactAlarm.apiLevel >= 33) {
    return {
      state: 'unavailable',
      message: deviceCopy.exactAlarm.unavailable,
      action: notificationAction('open-app-settings'),
    }
  }

  return {
    state: 'settings-required',
    message: deviceCopy.exactAlarm.settingsRequired,
    action: notificationAction('open-exact-alarm-settings'),
  }
}
