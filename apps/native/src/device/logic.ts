import { deviceCopy } from './copy'
import type {
  BatteryStatus,
  DeviceAction,
  DeviceActionType,
  DeviceCapabilitySnapshot,
  DeviceStatus,
  ExactAlarmStatus,
  LocationStatus,
  NotificationChannelState,
  NotificationStatus,
  SilentModeRoutingState,
} from './types'

export { deviceCopy }
export type {
  BatteryStatus,
  BatteryOptimizationState,
  CityCacheState,
  ConnectivityState,
  CoordinateCacheState,
  DeviceAction,
  DeviceActionType,
  DeviceCapabilitySnapshot,
  DeviceStatus,
  ExactAlarmAccess,
  ExactAlarmStatus,
  GpsState,
  LocationPermission,
  LocationStatus,
  NotificationPermission,
  NotificationChannelState,
  NotificationStatus,
  SilentModeRoutingState,
} from './types'

const actionLabels: Record<DeviceActionType, string> = {
  'request-notification-permission': deviceCopy.actions.requestNotificationPermission,
  'enable-notifications': deviceCopy.actions.enableNotifications,
  'open-app-settings': deviceCopy.actions.openAppSettings,
  'open-exact-alarm-settings': deviceCopy.actions.openExactAlarmSettings,
  'open-location-settings': deviceCopy.actions.openLocationSettings,
  'retry-location': deviceCopy.actions.retryLocation,
  'request-battery-exemption': deviceCopy.actions.requestBatteryExemption,
  'open-battery-settings': deviceCopy.actions.openBatterySettings,
}

const action = (type: DeviceActionType): DeviceAction => ({ type, label: actionLabels[type] })

const evaluateNotifications = (
  notifications: DeviceCapabilitySnapshot['notifications'],
): NotificationStatus => {
  if (notifications.permission !== 'granted') {
    if (notifications.permission === 'blocked') {
      return {
        capability: 'notifications',
        state: 'settings-required',
        message: deviceCopy.notifications.settingsRequired,
        action: action('open-app-settings'),
      }
    }

    return {
      capability: 'notifications',
      state: 'permission-required',
      message: deviceCopy.notifications.permissionRequired,
      action: action('request-notification-permission'),
    }
  }

  if (!notifications.enabled) {
    return {
      capability: 'notifications',
      state: 'disabled',
      message: deviceCopy.notifications.disabled,
      action: action('enable-notifications'),
    }
  }

  if (!notifications.deviceEnabled) {
    return {
      capability: 'notifications',
      state: 'settings-required',
      message: deviceCopy.notifications.deviceDisabled,
      action: action('open-app-settings'),
    }
  }

  if (notifications.channels !== 'ready') {
    return {
      capability: 'notifications',
      state: 'degraded',
      message: deviceCopy.notifications.channelsUnavailable,
      action: action('open-app-settings'),
    }
  }

  if (notifications.silentMode === 'failed') {
    return {
      capability: 'notifications',
      state: 'degraded',
      message: deviceCopy.notifications.silentModeFailed,
      action: action('open-app-settings'),
    }
  }

  return {
    capability: 'notifications',
    state: 'ready',
    message: deviceCopy.notifications.ready,
    action: null,
  }
}

const evaluateExactAlarm = (
  exactAlarm: DeviceCapabilitySnapshot['exactAlarm'],
): ExactAlarmStatus => {
  if (exactAlarm.apiLevel < 31) {
    return {
      capability: 'exact-alarm',
      state: 'not-required',
      message: deviceCopy.exactAlarm.notRequired,
      action: null,
    }
  }

  // USE_EXACT_ALARM is install-granted on Android 13+; there is no settings prompt.
  if (exactAlarm.apiLevel >= 33) {
    if (exactAlarm.access !== 'granted') {
      return {
        capability: 'exact-alarm',
        state: 'unavailable',
        message: deviceCopy.exactAlarm.unavailable,
        action: action('open-app-settings'),
      }
    }

    return {
      capability: 'exact-alarm',
      state: 'ready',
      message: deviceCopy.exactAlarm.ready,
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

  return {
    capability: 'exact-alarm',
    state: 'settings-required',
    message: deviceCopy.exactAlarm.settingsRequired,
    action: action('open-exact-alarm-settings'),
  }
}

const evaluateLocation = (
  location: DeviceCapabilitySnapshot['location'],
): LocationStatus => {
  if (location.permission === 'blocked') {
    return {
      capability: 'location',
      state: 'settings-required',
      message: deviceCopy.location.settingsRequired,
      action: action('open-app-settings'),
    }
  }

  if (location.permission !== 'granted') {
    return {
      capability: 'location',
      state: 'permission-required',
      message: deviceCopy.location.permissionRequired,
      action: action('retry-location'),
    }
  }

  if (location.gps === 'disabled') {
    return {
      capability: 'location',
      state: 'gps-disabled',
      message: deviceCopy.location.gpsDisabled,
      action: action('open-location-settings'),
    }
  }

  if (location.gps === 'unknown') {
    return {
      capability: 'location',
      state: 'unavailable',
      message: deviceCopy.location.unavailable,
      action: action('retry-location'),
    }
  }

  if (location.coordinateCache === 'stale' && location.connectivity !== 'offline') {
    return {
      capability: 'location',
      state: 'unavailable',
      message: deviceCopy.location.stale,
      action: action('retry-location'),
    }
  }

  if (location.coordinateCache === 'missing') {
    return {
      capability: 'location',
      state: 'unavailable',
      message:
        location.connectivity === 'offline'
          ? deviceCopy.location.noCache
          : deviceCopy.location.unavailable,
      action: action('retry-location'),
    }
  }

  const source = location.coordinateCache === 'fresh' ? 'fresh' : 'cache'
  const offline = location.connectivity === 'offline'

  return {
    capability: 'location',
    state: offline ? 'offline-cache' : 'ready',
    source,
    city: location.cityCache,
    message:
      location.cityCache === 'missing'
        ? deviceCopy.location.cityUnavailable
        : offline
          ? deviceCopy.location.offlineCache
          : deviceCopy.location.ready,
    action: null,
  }
}

const evaluateBattery = (
  battery: DeviceCapabilitySnapshot['battery'],
): BatteryStatus => {
  if (battery.optimization === 'exempt') {
    return {
      capability: 'battery',
      state: 'ready',
      message: deviceCopy.battery.ready,
      action: null,
    }
  }

  if (battery.optimization === 'optimized') {
    return {
      capability: 'battery',
      state: 'optional',
      message: deviceCopy.battery.optimized,
      action: action('request-battery-exemption'),
    }
  }

  if (battery.optimization === 'unknown') {
    return {
      capability: 'battery',
      state: 'unknown',
      message: deviceCopy.battery.unknown,
      action: action('open-battery-settings'),
    }
  }

  if (battery.optimization === 'stale') {
    return {
      capability: 'battery',
      state: 'stale',
      message: deviceCopy.battery.stale,
      action: action('open-battery-settings'),
    }
  }

  return {
    capability: 'battery',
    state: 'unavailable',
    message: deviceCopy.battery.unavailable,
    action: action('open-battery-settings'),
  }
}

export const evaluateDeviceStatus = (snapshot: DeviceCapabilitySnapshot): DeviceStatus => {
  const notifications = evaluateNotifications(snapshot.notifications)
  const exactAlarm = evaluateExactAlarm(snapshot.exactAlarm)
  const location = evaluateLocation(snapshot.location)
  const battery = evaluateBattery(snapshot.battery)

  let countdown: DeviceStatus['countdown']
  if (!snapshot.countdown.enabled) {
    countdown = {
      capability: 'countdown',
      state: 'disabled',
      message: deviceCopy.countdown.disabled,
      action: null,
    }
  } else if (notifications.state !== 'ready') {
    countdown = {
      capability: 'countdown',
      state: 'notifications-required',
      message: deviceCopy.countdown.notificationsRequired,
      action: notifications.action,
    }
  } else if (location.state !== 'ready' && location.state !== 'offline-cache') {
    countdown = {
      capability: 'countdown',
      state: 'location-required',
      message: deviceCopy.countdown.locationRequired,
      action: location.action ?? action('retry-location'),
    }
  } else {
    countdown = {
      capability: 'countdown',
      state: 'ready',
      message: deviceCopy.countdown.ready,
      action: null,
    }
  }

  return { notifications, exactAlarm, location, countdown, battery }
}
