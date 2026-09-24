import * as IntentLauncher from 'expo-intent-launcher'
import * as Location from 'expo-location'

import {
  enableServices,
  getFix,
  mapPermissionResponse,
  openAppSettings,
  openLocationSettings,
  readPermission,
  requestPermission,
  servicesEnabled,
} from '../location'

jest.mock('expo-location', () => ({
  Accuracy: { High: 4 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  enableNetworkProviderAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}))
jest.mock('expo-intent-launcher', () => ({
  ActivityAction: {
    APPLICATION_DETAILS_SETTINGS: 'android.settings.APPLICATION_DETAILS_SETTINGS',
    LOCATION_SOURCE_SETTINGS: 'android.settings.LOCATION_SOURCE_SETTINGS',
  },
  startActivityAsync: jest.fn(),
}))

const mockedLocation = Location as jest.Mocked<typeof Location>
const mockedIntentLauncher = IntentLauncher as jest.Mocked<typeof IntentLauncher>

describe('location adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it.each([
    [{ status: 'undetermined', canAskAgain: true }, 'undetermined'],
    [{ status: 'denied', canAskAgain: true }, 'denied'],
    [{ status: 'denied', canAskAgain: false }, 'blocked'],
    [{ status: 'granted', canAskAgain: true }, 'granted'],
  ] as const)('maps a %s permission response to %s', (response, expected) => {
    expect(mapPermissionResponse(response as never)).toBe(expected)
  })

  it('delegates permission reads and requests to expo-location', async () => {
    const response = { status: 'granted', canAskAgain: true } as const
    mockedLocation.getForegroundPermissionsAsync.mockResolvedValue(response as never)
    mockedLocation.requestForegroundPermissionsAsync.mockResolvedValue(response as never)

    await expect(readPermission()).resolves.toBe('granted')
    await expect(requestPermission()).resolves.toBe('granted')
    expect(mockedLocation.getForegroundPermissionsAsync).toHaveBeenCalledTimes(1)
    expect(mockedLocation.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1)
  })

  it('reads whether location services are enabled', async () => {
    mockedLocation.hasServicesEnabledAsync.mockResolvedValue(true)

    await expect(servicesEnabled()).resolves.toBe(true)
    expect(mockedLocation.hasServicesEnabledAsync).toHaveBeenCalledTimes(1)
  })

  it('resolves false when the location services dialog is rejected', async () => {
    mockedLocation.enableNetworkProviderAsync.mockResolvedValue(undefined)
    await expect(enableServices()).resolves.toBe(true)

    mockedLocation.enableNetworkProviderAsync.mockRejectedValue(new Error('dismissed'))
    await expect(enableServices()).resolves.toBe(false)
  })

  it('returns coordinates and a high-accuracy request for a successful fix', async () => {
    mockedLocation.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: 30.0444, longitude: 31.2357 },
    } as never)

    await expect(getFix()).resolves.toEqual({
      kind: 'ok',
      latitude: 30.0444,
      longitude: 31.2357,
    })
    expect(mockedLocation.getCurrentPositionAsync).toHaveBeenCalledWith({
      accuracy: 4,
      mayShowUserSettingsDialog: false,
    })
  })

  it('returns timeout and clears the timer when a fix does not arrive', async () => {
    jest.useFakeTimers()
    mockedLocation.getCurrentPositionAsync.mockReturnValue(new Promise(() => {}) as never)

    const result = getFix(50)
    await jest.advanceTimersByTimeAsync(50)

    await expect(result).resolves.toEqual({ kind: 'timeout' })
    expect(jest.getTimerCount()).toBe(0)
  })

  it('returns error and consumes a rejected fix promise', async () => {
    mockedLocation.getCurrentPositionAsync.mockRejectedValue(new Error('location unavailable'))

    await expect(getFix()).resolves.toEqual({ kind: 'error' })
  })

  it('opens app and location settings intents with the Android actions', async () => {
    mockedIntentLauncher.startActivityAsync.mockResolvedValue({ resultCode: -1 } as never)

    await openAppSettings()
    await openLocationSettings()

    expect(mockedIntentLauncher.startActivityAsync).toHaveBeenNthCalledWith(
      1,
      'android.settings.APPLICATION_DETAILS_SETTINGS',
      { data: 'package:com.nabd.app' },
    )
    expect(mockedIntentLauncher.startActivityAsync).toHaveBeenNthCalledWith(
      2,
      'android.settings.LOCATION_SOURCE_SETTINGS',
    )
  })
})
