export type NotificationPermission = 'granted' | 'denied' | 'blocked' | 'undetermined'

export type NotificationChannelState = 'ready' | 'missing' | 'incompatible' | 'unsupported'
export type SilentModeRoutingState = 'disabled' | 'ready' | 'failed'

export type ExactAlarmAccess = 'granted' | 'denied' | 'not-required' | 'unknown'

export type LocationPermission = 'granted' | 'denied' | 'blocked' | 'undetermined'
export type GpsState = 'enabled' | 'disabled' | 'unknown'
export type ConnectivityState = 'online' | 'offline' | 'unknown'
export type CoordinateCacheState = 'fresh' | 'stale' | 'missing'
export type CityCacheState = 'available' | 'missing'

export type BatteryOptimizationState = 'exempt' | 'optimized' | 'unavailable' | 'unknown' | 'stale'

export type DeviceActionType =
  | 'request-notification-permission'
  | 'enable-notifications'
  | 'open-app-settings'
  | 'open-exact-alarm-settings'
  | 'open-location-settings'
  | 'retry-location'
  | 'request-battery-exemption'
  | 'open-battery-settings'

export type DeviceCapabilitySnapshot = {
  notifications: {
    permission: NotificationPermission
    /** The app's persisted notification master switch. */
    enabled: boolean
    /** The OS/device notification switch, distinct from app preference. */
    deviceEnabled: boolean
    channels: NotificationChannelState
    silentMode: SilentModeRoutingState
  }
  exactAlarm: {
    apiLevel: number
    access: ExactAlarmAccess
  }
  location: {
    permission: LocationPermission
    gps: GpsState
    connectivity: ConnectivityState
    coordinateCache: CoordinateCacheState
    cityCache: CityCacheState
  }
  countdown: {
    enabled: boolean
  }
  battery: {
    optimization: BatteryOptimizationState
  }
}

export type DeviceAction = {
  type: DeviceActionType
  label: string
}

export type NotificationStatus =
  | { capability: 'notifications'; state: 'ready'; message: string; action: null }
  | {
      capability: 'notifications'
      state: 'permission-required'
      message: string
      action: DeviceAction
    }
  | {
      capability: 'notifications'
      state: 'settings-required' | 'disabled' | 'degraded'
      message: string
      action: DeviceAction
    }

export type ExactAlarmStatus =
  | { capability: 'exact-alarm'; state: 'ready'; message: string; action: null }
  | { capability: 'exact-alarm'; state: 'not-required'; message: string; action: null }
  | {
      capability: 'exact-alarm'
      state: 'settings-required' | 'unavailable'
      message: string
      action: DeviceAction
    }

export type LocationStatus =
  | {
      capability: 'location'
      state: 'ready' | 'offline-cache'
      source: 'fresh' | 'cache'
      city: CityCacheState
      message: string
      action: null
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

export type CountdownStatus =
  | { capability: 'countdown'; state: 'disabled'; message: string; action: null }
  | { capability: 'countdown'; state: 'ready'; message: string; action: null }
  | {
      capability: 'countdown'
      state: 'notifications-required' | 'location-required'
      message: string
      action: DeviceAction
    }

export type BatteryStatus =
  | { capability: 'battery'; state: 'ready'; message: string; action: null }
  | { capability: 'battery'; state: 'optional'; message: string; action: DeviceAction }
  | {
      capability: 'battery'
      state: 'unknown' | 'stale' | 'unavailable'
      message: string
      action: DeviceAction
    }

export type DeviceStatus = {
  notifications: NotificationStatus
  exactAlarm: ExactAlarmStatus
  location: LocationStatus
  countdown: CountdownStatus
  battery: BatteryStatus
}
