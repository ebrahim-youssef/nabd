import { Linking } from 'react-native'

import type { DevicePlatform } from './contract'

export const iosDevicePlatform: DevicePlatform = {
  // iOS has no channel preparation equivalent, so notification delivery is unsupported here.
  prepareNotificationDelivery: async () => 'unsupported',
  // iOS prayer alert scheduling is a separate implementation, so Android scheduling is unsupported here.
  schedulePrayerAlerts: async () => 'unsupported',
  // iOS cannot cancel these Android alerts, so cancellation is unsupported here.
  cancelPrayerAlerts: async () => 'unsupported',
  // iOS has no exact-alarm permission, so exact timing is unsupported here.
  readExactTimingStatus: () => 'unsupported',
  // iOS has no exact-alarm settings action, so this action is unsupported here.
  openExactTimingSettings: async () => 'unsupported',
  // iOS has no Android battery-protection state, so the capability is unsupported here.
  readBatteryProtectionStatus: () => 'unsupported',
  // iOS has no battery-protection exemption request, so the action is unsupported here.
  requestBatteryProtection: () => 'unsupported',
  // iOS has no persistent countdown notification equivalent, so setting one is unsupported here.
  setCountdownNotification: () => 'unsupported',
  // iOS has no persistent countdown notification to clear, so clearing is unsupported here.
  clearCountdownNotification: () => 'unsupported',
  // iOS has no persistent countdown notification status, so reading it is unsupported here.
  getCountdownNotificationStatus: () => 'unsupported',
  // iOS has no Android services dialog, so enabling location services is unsupported here.
  enableLocationServices: async () => 'unsupported',
  // iOS opens app settings only, so it cannot open a dedicated location settings page here.
  openLocationSettings: async () => {
    await Linking.openSettings()
    return 'opened'
  },
  // iOS opens the app settings page, which is the available settings action here.
  openAppSettings: async () => {
    await Linking.openSettings()
    return 'opened'
  },
  // iOS has no Android clock-change subscription for these capabilities, so this is a no-op.
  subscribeToClockChanges: () => () => undefined,
}
