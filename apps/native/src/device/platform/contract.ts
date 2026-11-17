import type { AlarmPayload, CalculationMethodId } from '../../prayer-times/logic'
import type { Coords } from '../types'

import type { CountdownNotificationResult } from '../countdownNotification'
import type {
  BatteryOptimizationRequestResult,
  BatteryOptimizationStatus,
  ExactAlarmSnapshot,
} from '../types'

export type { CountdownNotificationResult }

export type NotificationDeliveryResult = 'prepared' | 'unsupported'
export type PrayerAlertResult = 'scheduled' | 'cancelled' | 'unsupported'
export type ExactTimingStatus = ExactAlarmSnapshot | 'unsupported'
export type BatteryProtectionStatus = BatteryOptimizationStatus
export type BatteryProtectionRequestResult = BatteryOptimizationRequestResult
export type SettingsActionResult = 'opened' | 'unsupported'
export type LocationServicesResult = boolean | 'unsupported'
export type ClockChangeListener = () => void

export type DevicePlatform = {
  prepareNotificationDelivery: () => Promise<NotificationDeliveryResult>
  schedulePrayerAlerts: (
    alarms: AlarmPayload[],
    silentMode: boolean,
    now: number,
  ) => Promise<PrayerAlertResult>
  cancelPrayerAlerts: () => Promise<PrayerAlertResult>
  readExactTimingStatus: () => ExactTimingStatus
  openExactTimingSettings: () => Promise<SettingsActionResult>
  readBatteryProtectionStatus: () => BatteryProtectionStatus
  requestBatteryProtection: () => BatteryProtectionRequestResult
  setCountdownNotification: (
    now: number,
    coordinates: Coords,
    city: string | null,
    method?: CalculationMethodId,
  ) => CountdownNotificationResult
  clearCountdownNotification: () => 'cleared' | 'unsupported'
  getCountdownNotificationStatus: () => CountdownNotificationResult
  enableLocationServices: () => Promise<LocationServicesResult>
  openLocationSettings: () => Promise<SettingsActionResult>
  openAppSettings: () => Promise<SettingsActionResult>
  subscribeToClockChanges: (listener: ClockChangeListener) => () => void
}
