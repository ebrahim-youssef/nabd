import { DEFAULT_NOTIFICATION_PREFS } from '@nabd/shared'

import { mapCapabilitySnapshot } from '../useDeviceCapabilities'

jest.mock('../../../modules/nabd-device-capabilities', () => ({
  __esModule: true,
  default: {},
}))

const nativeSnapshot = {
  notificationPermission: 'granted' as const,
  notificationsEnabled: true,
  exactAlarmAccess: true,
  alarmChannels: 'ready' as const,
  countdownEnabled: false,
  locationPermission: 'granted' as const,
  locationServicesEnabled: true,
  batteryOptimizationIgnored: true,
  batteryOptimizationAvailable: true,
}

describe('device capability adapter', () => {
  it('maps an offline stale coordinate cache to the offline-cache state', () => {
    const snapshot = mapCapabilitySnapshot(
      nativeSnapshot,
      { latitude: 30, longitude: 31, city: 'القاهرة', recordedAt: 1_000 },
      { ...DEFAULT_NOTIFICATION_PREFS, enabled: true },
      1_000 + 11 * 60 * 1000,
      { apiLevel: 35, connectivity: 'offline' },
    )

    expect(snapshot.location).toEqual({
      permission: 'granted',
      gps: 'enabled',
      connectivity: 'offline',
      coordinateCache: 'stale',
      cityCache: 'available',
    })
  })

  it('keeps an offline no-cache state actionable', () => {
    const snapshot = mapCapabilitySnapshot(
      nativeSnapshot,
      null,
      { ...DEFAULT_NOTIFICATION_PREFS, enabled: true },
      1_000,
      { apiLevel: 35, connectivity: 'offline' },
    )

    expect(snapshot.location.coordinateCache).toBe('missing')
    expect(snapshot.location.connectivity).toBe('offline')
  })
})
