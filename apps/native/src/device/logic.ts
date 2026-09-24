import { deviceCopy } from './copy'
import type {
  DeviceAction,
  DeviceActionType,
  DeviceCapabilitySnapshot,
  DeviceStatus,
  LocationCapabilitySnapshot,
  LocationStatus,
} from './types'

export { deviceCopy }
export type {
  CityCacheState,
  ConnectivityState,
  CoordinateCacheState,
  DeviceAction,
  DeviceActionType,
  DeviceCapabilitySnapshot,
  DeviceStatus,
  GpsState,
  LocationAction,
  LocationActionType,
  LocationCapabilitySnapshot,
  LocationFixState,
  LocationPermission,
  LocationSnapshot,
  LocationStatus,
} from './types'

const actionLabels: Record<DeviceActionType, string> = {
  'open-app-settings': deviceCopy.actions.openAppSettings,
  'open-location-settings': deviceCopy.actions.openLocationSettings,
  'retry-location': deviceCopy.actions.retryLocation,
}

const action = (type: DeviceActionType): DeviceAction => ({ type, label: actionLabels[type] })

const cacheStatus = (
  location: LocationCapabilitySnapshot,
  message: string,
  retry: boolean,
): LocationStatus => ({
  capability: 'location',
  state: 'offline-cache',
  source: 'cache',
  city: location.cityCache,
  message,
  action: retry ? action('retry-location') : null,
})

const evaluateLocation = (location: LocationCapabilitySnapshot): LocationStatus => {
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

  const fix = location.fix ?? 'ok'

  if (location.coordinateCache === 'missing') {
    const message =
      fix === 'timeout'
        ? deviceCopy.location.timeout
        : location.connectivity === 'offline'
          ? deviceCopy.location.noCache
          : deviceCopy.location.unavailable
    return {
      capability: 'location',
      state: 'unavailable',
      message,
      action: action('retry-location'),
    }
  }

  if (fix === 'timeout' || fix === 'error') {
    if (location.cityCache === 'missing') {
      return {
        capability: 'location',
        state: 'city-required',
        message: deviceCopy.location.cityRequired,
        action: action('retry-location'),
      }
    }
    return cacheStatus(
      location,
      fix === 'timeout' ? deviceCopy.location.timeoutCache : deviceCopy.location.unavailable,
      true,
    )
  }

  if (location.coordinateCache === 'stale' && location.connectivity === 'online') {
    return {
      capability: 'location',
      state: 'unavailable',
      message: deviceCopy.location.stale,
      action: action('retry-location'),
    }
  }

  if (location.cityCache === 'missing') {
    return {
      capability: 'location',
      state: 'city-required',
      message: deviceCopy.location.cityRequired,
      action: action('retry-location'),
    }
  }

  if (location.connectivity === 'online') {
    return {
      capability: 'location',
      state: 'ready',
      source: 'fresh',
      city: location.cityCache,
      message: deviceCopy.location.ready,
      action: null,
    }
  }

  const unknownConnectivity = location.connectivity === 'unknown'
  return cacheStatus(
    location,
    unknownConnectivity ? deviceCopy.location.unknownCache : deviceCopy.location.offlineCache,
    unknownConnectivity,
  )
}

export { evaluateLocation }
export const evaluateDeviceStatus = (snapshot: DeviceCapabilitySnapshot): DeviceStatus => ({
  location: evaluateLocation(snapshot.location),
})
