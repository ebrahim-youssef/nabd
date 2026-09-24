import { deviceCopy } from './copy'
import type {
  LocationAction,
  LocationActionType,
  LocationCapabilitySnapshot,
  LocationStatus,
} from './types'

export { deviceCopy }
export type {
  CityCacheState,
  ConnectivityState,
  CoordinateCacheState,
  GpsState,
  LocationAction,
  LocationActionType,
  LocationCapabilitySnapshot,
  LocationFixState,
  LocationPermission,
  LocationStatus,
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

const cityRequired = (): LocationStatus => ({
  state: 'city-required',
  message: deviceCopy.location.cityRequired,
  action: action('retry-location'),
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
    if (location.cityCache === 'missing') {
      return cityRequired()
    }
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

  if (location.cityCache === 'missing') {
    return cityRequired()
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
