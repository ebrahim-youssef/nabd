import { deviceCopy, evaluateLocation, mapDevicePermission } from '../logic'
import type { LocationCapabilitySnapshot } from '../types'

const baseSnapshot: LocationCapabilitySnapshot = {
  permission: 'granted',
  gps: 'enabled',
  connectivity: 'online',
  coordinateCache: 'fresh',
}

describe('device permission mapping', () => {
  it.each([
    [{ status: 'undetermined', canAskAgain: true }, 'undetermined'],
    [{ status: 'denied', canAskAgain: true }, 'denied'],
    [{ status: 'denied', canAskAgain: false }, 'blocked'],
    [{ status: 'granted', canAskAgain: true }, 'granted'],
  ] as const)('maps a %s permission response to %s', (response, expected) => {
    expect(mapDevicePermission(response)).toBe(expected)
  })
})

describe('location status logic', () => {
  it('reports a ready fresh location with no action', () => {
    expect(evaluateLocation(baseSnapshot)).toEqual({
      state: 'ready',
      message: deviceCopy.location.ready,
      action: null,
    })
  })

  it('keeps denied location permission actionable', () => {
    const status = evaluateLocation({ ...baseSnapshot, permission: 'denied' })

    expect(status).toMatchObject({
      state: 'permission-required',
      action: { type: 'retry-location' },
      message: deviceCopy.location.permissionRequired,
    })
  })

  it('routes blocked location permission to app settings', () => {
    const status = evaluateLocation({ ...baseSnapshot, permission: 'blocked' })

    expect(status).toMatchObject({
      state: 'settings-required',
      action: { type: 'open-app-settings' },
      message: deviceCopy.location.settingsRequired,
    })
  })

  it('keeps GPS-disabled distinct from permission denial', () => {
    const status = evaluateLocation({ ...baseSnapshot, gps: 'disabled' })

    expect(status).toMatchObject({
      state: 'gps-disabled',
      action: { type: 'open-location-settings' },
      message: deviceCopy.location.gpsDisabled,
    })
  })

  it('maps a timeout to retry while using cached coordinates', () => {
    const status = evaluateLocation({
      ...baseSnapshot,
      coordinateCache: 'stale',
      fix: 'timeout',
    })

    expect(status).toMatchObject({
      state: 'offline-cache',
      action: { type: 'retry-location' },
      message: deviceCopy.location.timeoutCache,
    })
  })

  it('maps a timeout without cache to an actionable unavailable state', () => {
    const status = evaluateLocation({
      ...baseSnapshot,
      coordinateCache: 'missing',
      fix: 'timeout',
    })

    expect(status).toMatchObject({
      state: 'unavailable',
      action: { type: 'retry-location' },
      message: deviceCopy.location.timeout,
    })
  })

  it('uses a cached location while offering retry when connectivity is unknown', () => {
    const status = evaluateLocation({
      ...baseSnapshot,
      connectivity: 'unknown',
      coordinateCache: 'stale',
    })

    expect(status).toMatchObject({
      state: 'offline-cache',
      action: { type: 'retry-location' },
      message: deviceCopy.location.unknownCache,
    })
  })

  it('keeps a fresh unknown-connectivity cache usable and actionable', () => {
    const status = evaluateLocation({ ...baseSnapshot, connectivity: 'unknown' })

    expect(status).toMatchObject({
      state: 'offline-cache',
      action: { type: 'retry-location' },
    })
  })

  it('uses an offline cache without a retry action', () => {
    const status = evaluateLocation({
      ...baseSnapshot,
      connectivity: 'offline',
      coordinateCache: 'stale',
    })

    expect(status).toMatchObject({
      state: 'offline-cache',
      action: null,
      message: deviceCopy.location.offlineCache,
    })
  })

  it('does not treat an online stale cache as fresh', () => {
    const status = evaluateLocation({ ...baseSnapshot, coordinateCache: 'stale' })

    expect(status).toMatchObject({
      state: 'unavailable',
      action: { type: 'retry-location' },
      message: deviceCopy.location.stale,
    })
  })

  it('offers retry when offline and no coordinate cache exists', () => {
    const status = evaluateLocation({
      ...baseSnapshot,
      connectivity: 'offline',
      coordinateCache: 'missing',
    })

    expect(status).toMatchObject({
      state: 'unavailable',
      action: { type: 'retry-location' },
      message: deviceCopy.location.noCache,
    })
  })
})
