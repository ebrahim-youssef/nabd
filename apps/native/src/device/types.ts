export type DevicePermission = 'granted' | 'denied' | 'blocked' | 'undetermined'
export type LocationPermission = DevicePermission
export type NotificationPermission = DevicePermission
export type GpsState = 'enabled' | 'disabled' | 'unknown'
export type ConnectivityState = 'online' | 'offline' | 'unknown'
export type CoordinateCacheState = 'fresh' | 'stale' | 'missing'
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
  fix?: LocationFixState
}

export type LocationStatus = {
  state:
    | 'ready'
    | 'offline-cache'
    | 'permission-required'
    | 'settings-required'
    | 'gps-disabled'
    | 'unavailable'
  message: string
  action: LocationAction | null
}

export type ExactAlarmAccess = 'not-required' | 'granted' | 'denied' | 'unknown'

export type NotificationActionType =
  | 'request-notification-permission'
  | 'enable-notifications'
  | 'open-app-settings'
  | 'open-exact-alarm-settings'

export type NotificationAction = {
  type: NotificationActionType
  label: string
}

export type NotificationSettingsSnapshot = {
  permission: NotificationPermission
  enabled: boolean
}

export type ExactAlarmSnapshot = {
  apiLevel: number
  access: ExactAlarmAccess
}

export type NotificationStatus =
  | { state: 'ready'; message: string; action: null }
  | {
      state: 'permission-required' | 'settings-required' | 'disabled'
      message: string
      action: NotificationAction
    }

export type ExactAlarmStatus =
  | { state: 'ready' | 'not-required'; message: string; action: null }
  | {
      state: 'settings-required' | 'unavailable'
      message: string
      action: NotificationAction
    }
