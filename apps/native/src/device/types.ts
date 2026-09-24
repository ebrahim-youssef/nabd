export type LocationPermission = 'granted' | 'denied' | 'blocked' | 'undetermined'
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

export type NotificationPermission = 'undetermined' | 'denied' | 'blocked' | 'granted'

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
  deviceEnabled?: boolean
}

export type ExactAlarmSnapshot = {
  apiLevel: number
  access: ExactAlarmAccess
}

export type NotificationCapabilitySnapshot = NotificationSettingsSnapshot & {
  exactAlarm?: ExactAlarmSnapshot
}

export type DeviceNotificationSnapshot = {
  notifications: NotificationSettingsSnapshot
  exactAlarm: ExactAlarmSnapshot
}

export type NotificationStatus =
  | { capability: 'notifications'; state: 'ready'; message: string; action: null }
  | {
      capability: 'notifications'
      state: 'permission-required' | 'settings-required' | 'disabled'
      message: string
      action: NotificationAction
    }

export type ExactAlarmStatus =
  | { capability: 'exact-alarm'; state: 'ready' | 'not-required'; message: string; action: null }
  | {
      capability: 'exact-alarm'
      state: 'settings-required' | 'unavailable'
      message: string
      action: NotificationAction
    }

export type NotificationEvaluation = {
  notifications: NotificationStatus
  exactAlarm: ExactAlarmStatus
}
