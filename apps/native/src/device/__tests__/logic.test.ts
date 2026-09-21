import {
  deviceCopy,
  evaluateDeviceStatus,
  type DeviceCapabilitySnapshot,
} from '../logic'

const baseSnapshot: DeviceCapabilitySnapshot = {
  notifications: {
    permission: 'granted',
    enabled: true,
    deviceEnabled: true,
    channels: 'ready',
    silentMode: 'disabled',
  },
  exactAlarm: { apiLevel: 35, access: 'granted' },
  location: {
    permission: 'granted',
    gps: 'enabled',
    connectivity: 'online',
    coordinateCache: 'fresh',
    cityCache: 'available',
  },
  countdown: { enabled: false },
  battery: { optimization: 'exempt' },
}

describe('evaluateDeviceStatus', () => {
  it('reports notification permission denial with a retry action', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      notifications: { ...baseSnapshot.notifications, permission: 'denied' },
    })

    expect(status.notifications).toMatchObject({
      state: 'permission-required',
      action: { type: 'request-notification-permission' },
      message: deviceCopy.notifications.permissionRequired,
    })
  })

  it('keeps an undetermined notification permission actionable', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      notifications: { ...baseSnapshot.notifications, permission: 'undetermined' },
    })

    expect(status.notifications).toMatchObject({
      state: 'permission-required',
      action: { type: 'request-notification-permission' },
      message: deviceCopy.notifications.permissionRequired,
    })
  })

  it('routes permanently denied notifications to app settings', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      notifications: { ...baseSnapshot.notifications, permission: 'blocked' },
    })

    expect(status.notifications).toMatchObject({
      state: 'settings-required',
      action: { type: 'open-app-settings' },
      message: deviceCopy.notifications.settingsRequired,
    })
  })

  it('does not report notifications ready when the master switch is off', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      notifications: { ...baseSnapshot.notifications, enabled: false },
    })

    expect(status.notifications).toMatchObject({
      state: 'disabled',
      action: { type: 'enable-notifications' },
      message: deviceCopy.notifications.disabled,
    })
  })

  it('does not report notifications ready when the device toggle is off', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      notifications: { ...baseSnapshot.notifications, deviceEnabled: false },
    })

    expect(status.notifications).toMatchObject({
      state: 'settings-required',
      action: { type: 'open-app-settings' },
      message: deviceCopy.notifications.deviceDisabled,
    })
  })

  it.each(['missing', 'incompatible', 'unsupported'] as const)(
    'surfaces a failed notification channel (%s)',
    (channels) => {
      const status = evaluateDeviceStatus({
        ...baseSnapshot,
        notifications: { ...baseSnapshot.notifications, channels },
      })

      expect(status.notifications).toMatchObject({
        state: 'degraded',
        action: { type: 'open-app-settings' },
      })
      expect(status.notifications.message).toContain('قنوات الإشعارات')
    },
  )

  it('surfaces silent-mode routing failure without claiming a DND bypass', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      notifications: { ...baseSnapshot.notifications, silentMode: 'failed' },
    })

    expect(status.notifications).toMatchObject({
      state: 'degraded',
      action: { type: 'open-app-settings' },
      message: deviceCopy.notifications.silentModeFailed,
    })
    expect(status.notifications.message).toContain('عدم الإزعاج')
  })

  it('requires exact-alarm settings on Android 12 when access is denied', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      exactAlarm: { apiLevel: 31, access: 'denied' },
    })

    expect(status.exactAlarm).toMatchObject({
      state: 'settings-required',
      action: { type: 'open-exact-alarm-settings' },
      message: deviceCopy.exactAlarm.settingsRequired,
    })
  })

  it('does not report exact-alarm failure on Android versions where it is unavailable', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      exactAlarm: { apiLevel: 30, access: 'not-required' },
    })

    expect(status.exactAlarm).toMatchObject({
      state: 'not-required',
      action: null,
    })
  })

  it.each([31, 32])('routes Android %s exact-alarm access denial to settings', (apiLevel) => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      exactAlarm: { apiLevel, access: 'unknown' },
    })

    expect(status.exactAlarm).toMatchObject({
      state: 'settings-required',
      action: { type: 'open-exact-alarm-settings' },
    })
  })

  it.each([33, 34, 35])('does not claim exact-alarm readiness when Android %s access is unknown', (apiLevel) => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      exactAlarm: { apiLevel, access: 'unknown' },
    })

    expect(status.exactAlarm).toMatchObject({
      state: 'unavailable',
      action: { type: 'open-app-settings' },
      message: deviceCopy.exactAlarm.unavailable,
    })
  })

  it('keeps denied exact-alarm access actionable on Android 13 without an exact-alarm settings prompt', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      exactAlarm: { apiLevel: 33, access: 'denied' },
    })

    expect(status.exactAlarm).toMatchObject({
      state: 'unavailable',
      action: { type: 'open-app-settings' },
      message: deviceCopy.exactAlarm.unavailable,
    })
  })

  it('keeps denied location permission actionable without opening app settings', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      location: { ...baseSnapshot.location, permission: 'denied' },
    })

    expect(status.location).toMatchObject({
      state: 'permission-required',
      action: { type: 'retry-location' },
      message: deviceCopy.location.permissionRequired,
    })
  })

  it('keeps undetermined location permission actionable without opening app settings', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      location: { ...baseSnapshot.location, permission: 'undetermined' },
    })

    expect(status.location).toMatchObject({
      state: 'permission-required',
      action: { type: 'retry-location' },
      message: deviceCopy.location.permissionRequired,
    })
  })

  it('routes blocked location permission to app settings', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      location: { ...baseSnapshot.location, permission: 'blocked' },
    })

    expect(status.location).toMatchObject({
      state: 'settings-required',
      action: { type: 'open-app-settings' },
      message: deviceCopy.location.settingsRequired,
    })
  })

  it('keeps GPS-disabled distinct from denied location permission', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      location: { ...baseSnapshot.location, gps: 'disabled' },
    })

    expect(status.location).toMatchObject({
      state: 'gps-disabled',
      action: { type: 'open-location-settings' },
      message: deviceCopy.location.gpsDisabled,
    })
  })

  it('does not claim a usable location when GPS state is unknown', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      location: { ...baseSnapshot.location, gps: 'unknown' },
    })

    expect(status.location).toMatchObject({
      state: 'unavailable',
      action: { type: 'retry-location' },
      message: deviceCopy.location.unavailable,
    })
  })

  it('uses the coordinate and city cache when offline', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      location: {
        ...baseSnapshot.location,
        connectivity: 'offline',
        coordinateCache: 'stale',
      },
      countdown: { enabled: true },
    })

    expect(status.location).toMatchObject({
      state: 'offline-cache',
      source: 'cache',
      city: 'available',
      action: null,
    })
    expect(status.countdown).toMatchObject({ state: 'ready', action: null })
  })

  it('does not report an online stale coordinate cache as fresh ready', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      location: {
        ...baseSnapshot.location,
        coordinateCache: 'stale',
        connectivity: 'online',
      },
    })

    expect(status.location).toMatchObject({
      state: 'unavailable',
      action: { type: 'retry-location' },
      message: deviceCopy.location.stale,
    })
  })

  it('keeps coordinates usable online when the city cache is missing', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      location: { ...baseSnapshot.location, cityCache: 'missing' },
    })

    expect(status.location).toMatchObject({
      state: 'ready',
      city: 'missing',
      action: null,
      message: deviceCopy.location.cityUnavailable,
    })
  })

  it('keeps cached coordinates usable offline when the city cache is missing', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      location: {
        ...baseSnapshot.location,
        connectivity: 'offline',
        coordinateCache: 'stale',
        cityCache: 'missing',
      },
    })

    expect(status.location).toMatchObject({
      state: 'offline-cache',
      source: 'cache',
      city: 'missing',
      action: null,
      message: deviceCopy.location.cityUnavailable,
    })
  })

  it('offers retry when offline and no coordinate cache exists', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      location: {
        ...baseSnapshot.location,
        connectivity: 'offline',
        coordinateCache: 'missing',
        cityCache: 'missing',
      },
    })

    expect(status.location).toMatchObject({
      state: 'unavailable',
      action: { type: 'retry-location' },
      message: deviceCopy.location.noCache,
    })
  })

  it('blocks the countdown with the actionable notification state', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      notifications: { ...baseSnapshot.notifications, permission: 'blocked' },
      countdown: { enabled: true },
    })

    expect(status.countdown).toMatchObject({
      state: 'notifications-required',
      action: { type: 'open-app-settings' },
      message: deviceCopy.countdown.notificationsRequired,
    })
  })

  it('blocks an enabled countdown when location is stale online', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      location: {
        ...baseSnapshot.location,
        coordinateCache: 'stale',
        connectivity: 'online',
      },
      countdown: { enabled: true },
    })

    expect(status.countdown).toMatchObject({
      state: 'location-required',
      action: { type: 'retry-location' },
      message: deviceCopy.countdown.locationRequired,
    })
  })

  it('keeps battery optimization advisory and offers an exemption request', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      battery: { optimization: 'optimized' },
    })

    expect(status.battery).toMatchObject({
      state: 'optional',
      action: { type: 'request-battery-exemption' },
      message: deviceCopy.battery.optimized,
    })
  })

  it('distinguishes an unknown battery state from an unavailable capability', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      battery: { optimization: 'unknown' },
    })

    expect(status.battery).toMatchObject({
      state: 'unknown',
      action: { type: 'open-battery-settings' },
      message: deviceCopy.battery.unknown,
    })
  })

  it('distinguishes a stale battery state from an unavailable capability', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      battery: { optimization: 'stale' },
    })

    expect(status.battery).toMatchObject({
      state: 'stale',
      action: { type: 'open-battery-settings' },
      message: deviceCopy.battery.stale,
    })
  })

  it('keeps an unavailable battery capability explicit with a settings fallback', () => {
    const status = evaluateDeviceStatus({
      ...baseSnapshot,
      battery: { optimization: 'unavailable' },
    })

    expect(status.battery).toMatchObject({
      state: 'unavailable',
      action: { type: 'open-battery-settings' },
      message: deviceCopy.battery.unavailable,
    })
  })
})
