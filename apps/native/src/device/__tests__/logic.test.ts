import { deviceCopy, evaluateDeviceStatus } from '../logic'
import type { DeviceCapabilitySnapshot } from '../types'

const baseSnapshot: DeviceCapabilitySnapshot = {
  location: {
    permission: 'granted',
    gps: 'enabled',
    connectivity: 'online',
    coordinateCache: 'fresh',
    cityCache: 'available',
  },
}

describe('location status logic', () => {
  it('reports a ready fresh location with no action', () => {
    expect(evaluateDeviceStatus(baseSnapshot).location).toEqual({
      capability: 'location',
      state: 'ready',
      source: 'fresh',
      city: 'available',
      message: deviceCopy.location.ready,
      action: null,
    })
  })

  it('keeps denied location permission actionable', () => {
    const status = evaluateDeviceStatus({
      location: { ...baseSnapshot.location, permission: 'denied' },
    }).location

    expect(status).toMatchObject({
      state: 'permission-required',
      action: { type: 'retry-location' },
      message: deviceCopy.location.permissionRequired,
    })
  })

  it('routes blocked location permission to app settings', () => {
    const status = evaluateDeviceStatus({
      location: { ...baseSnapshot.location, permission: 'blocked' },
    }).location

    expect(status).toMatchObject({
      state: 'settings-required',
      action: { type: 'open-app-settings' },
      message: deviceCopy.location.settingsRequired,
    })
  })

  it('keeps GPS-disabled distinct from permission denial', () => {
    const status = evaluateDeviceStatus({
      location: { ...baseSnapshot.location, gps: 'disabled' },
    }).location

    expect(status).toMatchObject({
      state: 'gps-disabled',
      action: { type: 'open-location-settings' },
      message: deviceCopy.location.gpsDisabled,
    })
  })

  it('maps a timeout to retry while using cached coordinates', () => {
    const status = evaluateDeviceStatus({
      location: {
        ...baseSnapshot.location,
        coordinateCache: 'stale',
        fix: 'timeout',
      },
    }).location

    expect(status).toMatchObject({
      state: 'offline-cache',
      source: 'cache',
      action: { type: 'retry-location' },
      message: deviceCopy.location.timeoutCache,
    })
  })

  it('maps a timeout without cache to an actionable unavailable state', () => {
    const status = evaluateDeviceStatus({
      location: {
        ...baseSnapshot.location,
        coordinateCache: 'missing',
        cityCache: 'missing',
        fix: 'timeout',
      },
    }).location

    expect(status).toMatchObject({
      state: 'unavailable',
      action: { type: 'retry-location' },
      message: deviceCopy.location.timeout,
    })
  })

  it('produces an actionable city-required state when the city is missing', () => {
    const status = evaluateDeviceStatus({
      location: { ...baseSnapshot.location, cityCache: 'missing' },
    }).location

    expect(status).toMatchObject({
      state: 'city-required',
      action: { type: 'retry-location' },
      message: deviceCopy.location.cityRequired,
    })
  })

  it('uses a cached location while offering retry when connectivity is unknown', () => {
    const status = evaluateDeviceStatus({
      location: {
        ...baseSnapshot.location,
        connectivity: 'unknown',
        coordinateCache: 'stale',
      },
    }).location

    expect(status).toMatchObject({
      state: 'offline-cache',
      source: 'cache',
      action: { type: 'retry-location' },
      message: deviceCopy.location.unknownCache,
    })
  })

  it('keeps a fresh unknown-connectivity cache usable and actionable', () => {
    const status = evaluateDeviceStatus({
      location: { ...baseSnapshot.location, connectivity: 'unknown' },
    }).location

    expect(status).toMatchObject({
      state: 'offline-cache',
      source: 'cache',
      action: { type: 'retry-location' },
    })
  })

  it('uses an offline cache without a retry action', () => {
    const status = evaluateDeviceStatus({
      location: {
        ...baseSnapshot.location,
        connectivity: 'offline',
        coordinateCache: 'stale',
      },
    }).location

    expect(status).toMatchObject({
      state: 'offline-cache',
      source: 'cache',
      action: null,
      message: deviceCopy.location.offlineCache,
    })
  })

  it('does not treat an online stale cache as fresh', () => {
    const status = evaluateDeviceStatus({
      location: { ...baseSnapshot.location, coordinateCache: 'stale' },
    }).location

    expect(status).toMatchObject({
      state: 'unavailable',
      action: { type: 'retry-location' },
      message: deviceCopy.location.stale,
    })
  })

  it('offers retry when offline and no coordinate cache exists', () => {
    const status = evaluateDeviceStatus({
      location: {
        ...baseSnapshot.location,
        connectivity: 'offline',
        coordinateCache: 'missing',
        cityCache: 'missing',
      },
    }).location

    expect(status).toMatchObject({
      state: 'unavailable',
      action: { type: 'retry-location' },
      message: deviceCopy.location.noCache,
    })
  })
})
