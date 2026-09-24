export type LocationPermission = 'granted' | 'denied' | 'blocked' | 'undetermined'
export type GpsState = 'enabled' | 'disabled' | 'unknown'
export type ConnectivityState = 'online' | 'offline' | 'unknown'
export type CoordinateCacheState = 'fresh' | 'stale' | 'missing'
export type CityCacheState = 'available' | 'missing'
export type LocationFixState = 'ok' | 'timeout' | 'error'

export type DeviceActionType = 'open-app-settings' | 'open-location-settings' | 'retry-location'
export type LocationActionType = DeviceActionType

export type DeviceAction = {
  type: DeviceActionType
  label: string
}
export type LocationAction = DeviceAction

export type LocationCapabilitySnapshot = {
  permission: LocationPermission
  gps: GpsState
  connectivity: ConnectivityState
  coordinateCache: CoordinateCacheState
  cityCache: CityCacheState
  fix?: LocationFixState
}

export type LocationSnapshot = LocationCapabilitySnapshot

export type LocationStatus =
  | {
      capability: 'location'
      state: 'ready' | 'offline-cache'
      source: 'fresh' | 'cache'
      city: CityCacheState
      message: string
      action: DeviceAction | null
    }
  | {
      capability: 'location'
      state:
        | 'permission-required'
        | 'settings-required'
        | 'gps-disabled'
        | 'city-required'
        | 'unavailable'
      message: string
      action: DeviceAction
    }

export type DeviceCapabilitySnapshot = {
  location: LocationCapabilitySnapshot
}

export type DeviceStatus = {
  location: LocationStatus
}
