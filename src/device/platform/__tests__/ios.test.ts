import { Linking } from 'react-native'

import { iosDevicePlatform } from '../ios'

describe('iOS device platform', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('returns unsupported for Android-only capabilities without touching native modules', async () => {
    await expect(iosDevicePlatform.prepareNotificationDelivery()).resolves.toBe('unsupported')
    await expect(
      iosDevicePlatform.schedulePrayerAlerts([], false, 1_800_000_000_000),
    ).resolves.toBe('unsupported')
    await expect(iosDevicePlatform.cancelPrayerAlerts()).resolves.toBe('unsupported')
    expect(iosDevicePlatform.readExactTimingStatus()).toBe('unsupported')
    await expect(iosDevicePlatform.openExactTimingSettings()).resolves.toBe('unsupported')
    expect(iosDevicePlatform.readBatteryProtectionStatus()).toBe('unsupported')
    expect(iosDevicePlatform.requestBatteryProtection()).toBe('unsupported')
    expect(
      iosDevicePlatform.setCountdownNotification(
        1_800_000_000_000,
        { latitude: 30, longitude: 31 },
        null,
      ),
    ).toBe('unsupported')
    expect(iosDevicePlatform.clearCountdownNotification()).toBe('unsupported')
    expect(iosDevicePlatform.getCountdownNotificationStatus()).toBe('unsupported')
    await expect(iosDevicePlatform.enableLocationServices()).resolves.toBe('unsupported')
    expect(Linking.openSettings).not.toHaveBeenCalled()
  })

  it('opens app settings for location actions', async () => {
    await expect(iosDevicePlatform.openLocationSettings()).resolves.toBe('opened')
    await expect(iosDevicePlatform.openAppSettings()).resolves.toBe('opened')

    expect(Linking.openSettings).toHaveBeenCalledTimes(2)
  })

  it('does not subscribe to clock changes', () => {
    const listener = jest.fn()
    const unsubscribe = iosDevicePlatform.subscribeToClockChanges(listener)

    unsubscribe()

    expect(listener).not.toHaveBeenCalled()
  })
})
