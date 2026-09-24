import { act, renderHook, waitFor } from '@testing-library/react-native'
import * as IntentLauncher from 'expo-intent-launcher'
import * as Location from 'expo-location'
import { useSQLiteContext } from 'expo-sqlite'
import { AppState } from 'react-native'

import type { CachedLocation } from '../db'
import { createDeviceRepository } from '../db'
import { useLocationCapability } from '../useLocationCapability'

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
    addEventListener: jest.fn(() => jest.fn()),
  },
}))
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
jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('../db', () => ({
  createDeviceRepository: jest.fn(),
}))

const mockedLocation = Location as jest.Mocked<typeof Location>
const mockedIntentLauncher = IntentLauncher as jest.Mocked<typeof IntentLauncher>
const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedCreateDeviceRepository = createDeviceRepository as jest.MockedFunction<
  typeof createDeviceRepository
>
const NOW = 1_800_000_000_000
const now = () => NOW

type TestCacheState = CachedLocation & { fresh: boolean }

type TestRepository = {
  writeCachedLocation: jest.Mock<Promise<void>, [unknown, number]>
  readLocationCacheState: jest.Mock<Promise<TestCacheState | null>, [number]>
}

let repository: TestRepository
let appStateListener:
  ((state: 'active' | 'background' | 'inactive' | 'unknown' | 'extension') => void) | undefined

function createRepository(cached: CachedLocation | null = null, fresh = false): TestRepository {
  return {
    writeCachedLocation: jest.fn().mockResolvedValue(undefined),
    readLocationCacheState: jest
      .fn()
      .mockImplementation(async () => (cached ? { ...cached, fresh } : null)),
  }
}

function createConnectivityProvider() {
  return {
    getState: jest.fn(() => 'online' as const),
    refresh: jest.fn().mockResolvedValue('online' as const),
    subscribe: jest.fn(() => jest.fn()),
  }
}

function grantPermission() {
  mockedLocation.getForegroundPermissionsAsync.mockResolvedValue({
    status: 'granted',
    canAskAgain: true,
    granted: true,
    expires: 'never',
  } as never)
  mockedLocation.requestForegroundPermissionsAsync.mockResolvedValue({
    status: 'granted',
    canAskAgain: true,
    granted: true,
    expires: 'never',
  } as never)
  mockedLocation.hasServicesEnabledAsync.mockResolvedValue(true)
  mockedLocation.enableNetworkProviderAsync.mockResolvedValue(undefined)
  mockedLocation.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: 30.0444, longitude: 31.2357 },
  } as never)
  mockedIntentLauncher.startActivityAsync.mockResolvedValue({ resultCode: -1 } as never)
}

function renderLocation(
  options: {
    reverseGeocoder?: jest.Mock
    connectivityProvider?: ReturnType<typeof createConnectivityProvider>
  } = {},
) {
  const connectivityProvider = options.connectivityProvider ?? createConnectivityProvider()
  const reverseGeocoder = options.reverseGeocoder ?? jest.fn().mockResolvedValue('القاهرة')
  return renderHook(() =>
    useLocationCapability({
      connectivityProvider,
      reverseGeocoder,
      now,
    }),
  )
}

describe('useLocationCapability', () => {
  beforeEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
    repository = createRepository()
    mockedCreateDeviceRepository.mockReturnValue(repository as never)
    mockedUseSQLiteContext.mockReturnValue({} as never)
    appStateListener = undefined
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appStateListener = listener
      return { remove: jest.fn() } as never
    })
    grantPermission()
  })

  it('persists coordinates and the best-effort city on a successful fix', async () => {
    const geocoder = jest.fn().mockResolvedValue('القاهرة')
    const { result } = renderLocation({ reverseGeocoder: geocoder })

    await waitFor(() => expect(result.current.status.state).toBe('ready'))

    expect(result.current.coordinates).toEqual({ latitude: 30.0444, longitude: 31.2357 })
    expect(result.current.city).toBe('القاهرة')
    expect(repository.writeCachedLocation).toHaveBeenNthCalledWith(
      1,
      { latitude: 30.0444, longitude: 31.2357, city: null },
      NOW,
    )
    expect(repository.writeCachedLocation).toHaveBeenNthCalledWith(
      2,
      { latitude: 30.0444, longitude: 31.2357, city: 'القاهرة' },
      NOW,
    )
  })

  it('keeps the previous city when geocoding fails', async () => {
    repository = createRepository({
      latitude: 30,
      longitude: 31,
      city: 'القاهرة',
      recordedAt: NOW,
    })
    mockedCreateDeviceRepository.mockReturnValue(repository as never)
    const geocoder = jest.fn().mockRejectedValue(new Error('network down'))
    const { result } = renderLocation({ reverseGeocoder: geocoder })

    await waitFor(() => expect(result.current.status.state).toBe('ready'))

    expect(result.current.city).toBe('القاهرة')
    expect(repository.writeCachedLocation).toHaveBeenCalledTimes(1)
    expect(repository.writeCachedLocation).toHaveBeenNthCalledWith(
      1,
      { latitude: 30.0444, longitude: 31.2357, city: 'القاهرة' },
      NOW,
    )
  })

  it('does not request a fix on mount when the cached location is fresh', async () => {
    repository = createRepository(
      {
        latitude: 30,
        longitude: 31,
        city: 'القاهرة',
        recordedAt: NOW - 1_000,
      },
      true,
    )
    mockedCreateDeviceRepository.mockReturnValue(repository as never)

    const { result } = renderLocation()

    await waitFor(() => expect(result.current.isRefreshing).toBe(false))
    expect(mockedLocation.getCurrentPositionAsync).not.toHaveBeenCalled()
    expect(result.current.coordinates).toEqual({ latitude: 30, longitude: 31 })
  })

  it.each([
    [
      'stale',
      {
        latitude: 30,
        longitude: 31,
        city: 'القاهرة',
        recordedAt: NOW,
      } satisfies CachedLocation,
    ],
    ['missing', null],
  ] as const)('requests a fix on mount when the cache is %s', async (_state, cached) => {
    repository = createRepository(cached)
    mockedCreateDeviceRepository.mockReturnValue(repository as never)

    const { result } = renderLocation()

    await waitFor(() => expect(result.current.status.state).toBe('ready'))
    expect(mockedLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1)
  })

  it('rechecks permission and services without a fix when the app becomes active with a fresh cache', async () => {
    repository = createRepository(
      {
        latitude: 30,
        longitude: 31,
        city: 'القاهرة',
        recordedAt: NOW - 1_000,
      },
      true,
    )
    mockedCreateDeviceRepository.mockReturnValue(repository as never)
    const connectivityProvider = createConnectivityProvider()
    const { result } = renderLocation({ connectivityProvider })

    await waitFor(() => expect(result.current.isRefreshing).toBe(false))
    mockedLocation.getForegroundPermissionsAsync.mockClear()
    mockedLocation.hasServicesEnabledAsync.mockClear()
    mockedLocation.getCurrentPositionAsync.mockClear()
    connectivityProvider.refresh.mockClear()

    act(() => appStateListener?.('active'))

    await waitFor(() =>
      expect(mockedLocation.getForegroundPermissionsAsync).toHaveBeenCalledTimes(1),
    )
    await waitFor(() => expect(mockedLocation.hasServicesEnabledAsync).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(connectivityProvider.refresh).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(result.current.isRefreshing).toBe(false))
    expect(mockedLocation.getCurrentPositionAsync).not.toHaveBeenCalled()
  })

  it('shares one in-flight refresh when refresh is called twice', async () => {
    let resolvePosition: ((position: unknown) => void) | undefined
    mockedLocation.getCurrentPositionAsync.mockReturnValue(
      new Promise((resolve) => {
        resolvePosition = resolve
      }) as never,
    )
    const { result } = renderLocation({ reverseGeocoder: jest.fn().mockResolvedValue('القاهرة') })

    await waitFor(() => expect(mockedLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1))

    let first!: Promise<void>
    let second!: Promise<void>
    act(() => {
      first = result.current.refresh()
      second = result.current.refresh()
    })

    expect(first).toBe(second)
    expect(mockedLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolvePosition?.({ coords: { latitude: 30.0444, longitude: 31.2357 } })
      await Promise.all([first, second])
    })
    await waitFor(() => expect(result.current.status.state).toBe('ready'))
  })

  it('runs a forced fix after an unforced refresh completes', async () => {
    let resolvePermission: ((value: unknown) => void) | undefined
    mockedLocation.getForegroundPermissionsAsync.mockReturnValue(
      new Promise((resolve) => {
        resolvePermission = resolve
      }) as never,
    )
    repository = createRepository(
      {
        latitude: 30,
        longitude: 31,
        city: 'القاهرة',
        recordedAt: NOW - 1_000,
      },
      true,
    )
    mockedCreateDeviceRepository.mockReturnValue(repository as never)
    const { result } = renderLocation()

    await waitFor(() =>
      expect(mockedLocation.getForegroundPermissionsAsync).toHaveBeenCalledTimes(1),
    )

    let forced!: Promise<void>
    act(() => {
      forced = result.current.refresh({ force: true })
    })

    await act(async () => {
      resolvePermission?.({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never',
      })
      await forced
    })

    expect(mockedLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1)
  })

  it('forces a fix for an explicit retry with a fresh cache', async () => {
    repository = createRepository(
      {
        latitude: 30,
        longitude: 31,
        city: 'القاهرة',
        recordedAt: NOW - 1_000,
      },
      true,
    )
    mockedCreateDeviceRepository.mockReturnValue(repository as never)
    const { result } = renderLocation()

    await waitFor(() => expect(result.current.isRefreshing).toBe(false))
    mockedLocation.getCurrentPositionAsync.mockClear()

    await act(async () => {
      await result.current.runAction('retry-location')
    })

    expect(mockedLocation.getCurrentPositionAsync).toHaveBeenCalledTimes(1)
  })

  it('tries the services dialog before opening location settings on GPS retry', async () => {
    mockedLocation.hasServicesEnabledAsync.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const { result } = renderLocation()

    await waitFor(() => expect(result.current.status.state).toBe('gps-disabled'))
    await act(async () => {
      await result.current.runAction('retry-location')
    })

    await waitFor(() => expect(result.current.status.state).toBe('ready'))
    expect(mockedLocation.enableNetworkProviderAsync).toHaveBeenCalledTimes(1)
    expect(mockedIntentLauncher.startActivityAsync).not.toHaveBeenCalled()
  })

  it('falls back to location settings when the services dialog is rejected', async () => {
    mockedLocation.hasServicesEnabledAsync.mockResolvedValue(false)
    mockedLocation.enableNetworkProviderAsync.mockRejectedValue(new Error('dismissed'))
    const { result } = renderLocation()

    await waitFor(() => expect(result.current.status.state).toBe('gps-disabled'))
    await act(async () => {
      await result.current.runAction()
    })

    expect(mockedIntentLauncher.startActivityAsync).toHaveBeenCalledWith(
      'android.settings.LOCATION_SOURCE_SETTINGS',
    )
    expect(mockedLocation.getCurrentPositionAsync).not.toHaveBeenCalled()
  })

  it('requests permission before retrying when permission is denied but askable', async () => {
    mockedLocation.getForegroundPermissionsAsync
      .mockResolvedValueOnce({
        status: 'denied',
        canAskAgain: true,
        granted: false,
        expires: 'never',
      } as never)
      .mockResolvedValue({
        status: 'granted',
        canAskAgain: true,
        granted: true,
        expires: 'never',
      } as never)
    const { result } = renderLocation()

    await waitFor(() => expect(result.current.status.state).toBe('permission-required'))
    await act(async () => {
      await result.current.runAction()
    })

    await waitFor(() => expect(result.current.status.state).toBe('ready'))
    expect(mockedLocation.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1)
  })
})
