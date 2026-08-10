import { requireNativeModule } from 'expo-modules-core'

import type { AlarmPayload } from '@nabd/shared'

export type PermissionState = 'notAsked' | 'granted' | 'denied' | 'permanentlyDenied'
export type AlarmChannelState = 'notCreated' | 'ready' | 'degraded'

export type CapabilityStatus = {
  notificationPermission: PermissionState
  notificationsEnabled: boolean
  exactAlarmAccess: boolean
  alarmChannels: AlarmChannelState
  countdownEnabled: boolean
  locationPermission: PermissionState
  locationServicesEnabled: boolean
}

export type CountdownBoundary = { at: number; label: string; sunrise: boolean }
export type Coordinates = { latitude: number; longitude: number }
export type NativeLocationResult =
  | { ok: true; coords: Coordinates; cached: boolean }
  | { ok: false; reason: 'denied' | 'permanentlyDenied' | 'unavailable' }

type NativeAlarm = AlarmPayload & { channelId: string }

export interface NabdDeviceCapabilitiesModule {
  getCapabilityStatus(): Promise<CapabilityStatus>
  requestNotificationPermission(): Promise<{
    permission: PermissionState
    canAskAgain: boolean
  }>
  openApplicationSettings(): Promise<void>
  openExactAlarmSettings(): Promise<void>
  armAlarms(options: {
    alarms: NativeAlarm[]
    alarmOnSilent: boolean
  }): Promise<{ degraded: boolean }>
  cancelAlarms(): Promise<void>
  enableCountdown(options: { boundaries: CountdownBoundary[]; city: string | null }): Promise<void>
  disableCountdown(): Promise<void>
  ensureLocationServices(): Promise<{ enabled: boolean }>
  requestLocation(): Promise<NativeLocationResult>
}

const getNativeModule = () =>
  requireNativeModule<NabdDeviceCapabilitiesModule>('NabdDeviceCapabilities')

export const deviceCapabilities: NabdDeviceCapabilitiesModule = {
  getCapabilityStatus: () => getNativeModule().getCapabilityStatus(),
  requestNotificationPermission: () => getNativeModule().requestNotificationPermission(),
  openApplicationSettings: () => getNativeModule().openApplicationSettings(),
  openExactAlarmSettings: () => getNativeModule().openExactAlarmSettings(),
  armAlarms: (options) => getNativeModule().armAlarms(options),
  cancelAlarms: () => getNativeModule().cancelAlarms(),
  enableCountdown: (options) => getNativeModule().enableCountdown(options),
  disableCountdown: () => getNativeModule().disableCountdown(),
  ensureLocationServices: () => getNativeModule().ensureLocationServices(),
  requestLocation: () => getNativeModule().requestLocation(),
}

export const ALARM_CHANNELS = {
  before: 'prayer-before',
  adhan: 'prayer-adhan',
  adhanFajr: 'prayer-adhan-fajr',
  iqamah: 'prayer-iqamah',
  adhkarReminder: 'adhkar-reminder',
} as const

export async function armPrayerAlarms(
  payloads: AlarmPayload[],
  alarmOnSilent: boolean,
  native: NabdDeviceCapabilitiesModule = deviceCapabilities,
): Promise<{ degraded: boolean }> {
  return native.armAlarms({
    alarms: payloads.map((payload) => ({
      ...payload,
      channelId: ALARM_CHANNELS[payload.channelKey],
    })),
    alarmOnSilent,
  })
}

export async function requireNotificationPermission(
  native: NabdDeviceCapabilitiesModule = deviceCapabilities,
): Promise<PermissionState> {
  const result = await native.requestNotificationPermission()
  if (result.permission === 'denied' && !result.canAskAgain) return 'permanentlyDenied'
  return result.permission
}

export type CapabilityActionResult =
  | { ok: true }
  | { ok: false; reason: 'denied' | 'permanentlyDenied' | 'servicesDisabled' | 'degraded' }

export async function syncCountdownNotification(
  boundaries: CountdownBoundary[],
  city: string | null,
  native: NabdDeviceCapabilitiesModule = deviceCapabilities,
): Promise<CapabilityActionResult> {
  const status = await native.getCapabilityStatus()
  if (status.notificationPermission !== 'granted' || !status.notificationsEnabled) {
    await native.disableCountdown()
    return {
      ok: false,
      reason:
        status.notificationPermission === 'permanentlyDenied' ? 'permanentlyDenied' : 'denied',
    }
  }
  await native.enableCountdown({ boundaries, city })
  return { ok: true }
}

export async function resolveLocationServices(
  native: NabdDeviceCapabilitiesModule = deviceCapabilities,
): Promise<CapabilityActionResult> {
  const { enabled } = await native.ensureLocationServices()
  if (!enabled) return { ok: false, reason: 'servicesDisabled' }
  const status = await native.getCapabilityStatus()
  if (status.locationPermission === 'permanentlyDenied') {
    return { ok: false, reason: 'permanentlyDenied' }
  }
  return status.locationPermission === 'granted' ? { ok: true } : { ok: false, reason: 'denied' }
}

export type LocationRequestResult =
  | { ok: true; coords: Coordinates; cached: boolean }
  | {
      ok: false
      reason: 'servicesDisabled' | 'denied' | 'permanentlyDenied' | 'unavailable'
    }

/** Resolves the device toggle before prompting app permission, preserving NBD-68 semantics. */
export async function requestForegroundLocation(
  native: NabdDeviceCapabilitiesModule = deviceCapabilities,
): Promise<LocationRequestResult> {
  const { enabled } = await native.ensureLocationServices()
  if (!enabled) return { ok: false, reason: 'servicesDisabled' }
  return native.requestLocation()
}
