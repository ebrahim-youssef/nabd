import { requireNativeModule } from 'expo-modules-core'

export type NativePermissionState = 'granted' | 'notAsked' | 'denied' | 'permanentlyDenied'
export type ChannelCompatibility = 'ready' | 'missing' | 'incompatible' | 'unsupported'

export type CapabilitySnapshot = {
  notificationPermission: NativePermissionState
  notificationsEnabled: boolean
  exactAlarmAccess: boolean
  alarmChannels: ChannelCompatibility
  countdownEnabled: boolean
  locationPermission: NativePermissionState
  locationServicesEnabled: boolean
  batteryOptimizationIgnored: boolean
  batteryOptimizationAvailable: boolean
}

export type LocationResult =
  | { ok: true; coords: { latitude: number; longitude: number }; cached: boolean }
  | { ok: false; reason: 'denied' | 'permanentlyDenied' | 'gpsDisabled' | 'timeout' | 'unavailable' }

export type PermissionResult = {
  permission: NativePermissionState
  canAskAgain: boolean
}

export type PrayerAlarm = {
  id: number
  title: string
  body: string
  channelKey: 'before' | 'adhan' | 'adhanFajr' | 'iqamah' | 'adhkarReminder'
  at: number
}

export type PrayerScheduleResult = {
  armed: boolean
  persisted: boolean
  accepted: boolean
  channelCompatibility: ChannelCompatibility
  reason?: 'notificationsDisabled' | 'exactAlarmDenied' | 'channelsUnavailable' | 'invalidSchedule'
}

export type CountdownBoundary = {
  at: number
  label: string
  sunrise?: boolean
}

export type CountdownOptions = {
  boundaries: CountdownBoundary[]
  city?: string
}

export type CountdownResult = {
  enabled: boolean
  persisted: boolean
  reason?: 'notificationsDisabled'
}

export type BatteryOptimizationResult = {
  ignored: boolean
  requested: boolean
  available: boolean
}

export type NabdDeviceCapabilities = {
  getCapabilitySnapshot(): Promise<CapabilitySnapshot>
  requestNotificationPermission(): Promise<PermissionResult>
  openApplicationSettings(): Promise<void>
  openExactAlarmSettings(): Promise<void>
  requestLocation(): Promise<LocationResult>
  ensureLocationServices(): Promise<{ enabled: boolean; prompted: boolean }>
  replacePrayerSchedule(options: {
    alarms: PrayerAlarm[]
    alarmOnSilent: boolean
  }): Promise<PrayerScheduleResult>
  cancelPrayerSchedule(): Promise<void>
  setCountdown(options: CountdownOptions): Promise<CountdownResult>
  clearCountdown(): Promise<void>
  requestBatteryOptimizationExemption(): Promise<BatteryOptimizationResult>
  openBatteryOptimizationSettings(): Promise<void>
  restoreAfterBoot(): Promise<void>
}

export const nabdDeviceCapabilities = requireNativeModule<NabdDeviceCapabilities>(
  'NabdDeviceCapabilities',
)

export default nabdDeviceCapabilities
