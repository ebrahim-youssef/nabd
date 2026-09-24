export type LocationPermission = 'granted' | 'denied' | 'blocked' | 'undetermined'
export type GpsState = 'enabled' | 'disabled' | 'unknown'
export type ConnectivityState = 'online' | 'offline' | 'unknown'
export type CoordinateCacheState = 'fresh' | 'stale' | 'missing'
export type CityCacheState = 'available' | 'missing'
export type LocationFixState = 'ok' | 'timeout' | 'error'

export type LocationActionType = 'open-app-settings' | 'open-location-settings' | 'retry-location'

export type LocationAction = {
  type: LocationActionType
  label: string
}

export type LocationCapabilitySnapshot = {
  permission: LocationPermission
  gps: GpsState
  connectivity: ConnectivityState
  coordinateCache: CoordinateCacheState
  cityCache: CityCacheState
  fix?: LocationFixState
}

export type LocationStatus = {
  state:
    | 'ready'
    | 'offline-cache'
    | 'permission-required'
    | 'settings-required'
    | 'gps-disabled'
    | 'city-required'
    | 'unavailable'
  message: string
  action: LocationAction | null
}
