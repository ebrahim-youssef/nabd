import Constants from 'expo-constants'
import * as IntentLauncher from 'expo-intent-launcher'

import {
  clearCountdownNotification,
  getCountdownNotificationStatus,
  setCountdownNotification,
} from '../countdownNotification'
import { enableServices } from '../location'
import { readExactAlarmSnapshot, subscribeTimeChange } from '../exactAlarm'
import { ensureChannels } from '../notificationChannels'
import { cancelPrayerAlarms, replacePrayerAlarms } from '../notifications'
import { requestBatteryOptimizationExemption, readBatteryOptimizationStatus } from '../battery'
import type { DevicePlatform } from './contract'

const ANDROID_PACKAGE = 'com.nabd.app'

function androidPackage(): string {
  const packageName = Constants.expoConfig?.android?.package
  return typeof packageName === 'string' && packageName.trim() !== ''
    ? packageName
    : ANDROID_PACKAGE
}

async function openAppSettings(): Promise<'opened'> {
  await IntentLauncher.startActivityAsync(
    IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
    { data: 'package:' + androidPackage() },
  )
  return 'opened'
}

async function openLocationSettings(): Promise<'opened'> {
  await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS)
  return 'opened'
}

async function openExactTimingSettings(): Promise<'opened'> {
  await IntentLauncher.startActivityAsync(
    IntentLauncher.ActivityAction.REQUEST_SCHEDULE_EXACT_ALARM,
    { data: `package:${androidPackage()}` },
  )
  return 'opened'
}

export const androidDevicePlatform: DevicePlatform = {
  prepareNotificationDelivery: async () => {
    await ensureChannels()
    return 'prepared'
  },
  schedulePrayerAlerts: async (alarms, silentMode, now) => {
    await replacePrayerAlarms(alarms, silentMode, now)
    return 'scheduled'
  },
  cancelPrayerAlerts: async () => {
    await cancelPrayerAlarms()
    return 'cancelled'
  },
  readExactTimingStatus: readExactAlarmSnapshot,
  openExactTimingSettings,
  readBatteryProtectionStatus: readBatteryOptimizationStatus,
  requestBatteryProtection: requestBatteryOptimizationExemption,
  setCountdownNotification,
  clearCountdownNotification: () => {
    clearCountdownNotification()
    return 'cleared'
  },
  getCountdownNotificationStatus,
  enableLocationServices: enableServices,
  openLocationSettings,
  openAppSettings,
  subscribeToClockChanges: subscribeTimeChange,
}
