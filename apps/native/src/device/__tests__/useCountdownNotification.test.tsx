import { DEFAULT_NOTIFICATION_PREFS } from '@nabd/shared'
import { renderHook, waitFor } from '@testing-library/react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { AppState } from 'react-native'

import { PREFERENCE_KEYS } from '../../preferences/db'
import { devicePlatform } from '../platform'
import { resolveCityLabel } from '../reverseGeocode'
import { subscribePrayerReschedule } from '../prayerAlarms'
import { useCountdownNotification } from '../useCountdownNotification'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('../platform', () => ({
  devicePlatform: {
    clearCountdownNotification: jest.fn(),
    setCountdownNotification: jest.fn(),
    subscribeToClockChanges: jest.fn(),
  },
}))
jest.mock('../reverseGeocode', () => ({ resolveCityLabel: jest.fn() }))
jest.mock('../prayerAlarms', () => ({ subscribePrayerReschedule: jest.fn() }))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedClear = devicePlatform.clearCountdownNotification as jest.MockedFunction<
  typeof devicePlatform.clearCountdownNotification
>
const mockedSet = devicePlatform.setCountdownNotification as jest.MockedFunction<
  typeof devicePlatform.setCountdownNotification
>
const mockedResolveCityLabel = resolveCityLabel as jest.MockedFunction<typeof resolveCityLabel>
const mockedSubscribeTimeChange = devicePlatform.subscribeToClockChanges as jest.MockedFunction<
  typeof devicePlatform.subscribeToClockChanges
>
const mockedSubscribePrayerReschedule = subscribePrayerReschedule as jest.MockedFunction<
  typeof subscribePrayerReschedule
>

const mockGetFirstAsync = jest.fn()
const NOW = 1_800_000_000_000
const now = () => NOW
let appStateListener:
  ((state: 'active' | 'background' | 'inactive' | 'unknown' | 'extension') => void) | undefined
let appStateRemove: jest.Mock
let rescheduleListener: (() => void) | undefined
let unsubscribeReschedule: jest.Mock
let timeChangeListener: (() => void) | undefined
let unsubscribeTimeChange: jest.Mock

function setStoredValues(overrides: Record<string, string | null> = {}): void {
  const values: Record<string, string | null> = {
    [PREFERENCE_KEYS.countdownEnabled]: '0',
    [PREFERENCE_KEYS.calculationMethod]: 'egyptian',
    [PREFERENCE_KEYS.latitude]: '30.0444',
    [PREFERENCE_KEYS.longitude]: '31.2357',
    [PREFERENCE_KEYS.locationRecordedAt]: '1799999000000',
    [PREFERENCE_KEYS.notificationPrefs]: JSON.stringify({
      ...DEFAULT_NOTIFICATION_PREFS,
      enabled: true,
    }),
    ...overrides,
  }
  mockGetFirstAsync.mockImplementation(async (_source: string, key: string) => ({
    value: values[key] ?? null,
  }))
}

describe('useCountdownNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseSQLiteContext.mockReturnValue({ getFirstAsync: mockGetFirstAsync } as never)
    mockedClear.mockImplementation(() => 'cleared')
    mockedSet.mockReturnValue('posted')
    mockedResolveCityLabel.mockResolvedValue('القاهرة')
    unsubscribeTimeChange = jest.fn()
    unsubscribeReschedule = jest.fn()
    mockedSubscribeTimeChange.mockImplementation((listener) => {
      timeChangeListener = listener
      return unsubscribeTimeChange
    })
    mockedSubscribePrayerReschedule.mockImplementation((listener) => {
      rescheduleListener = listener
      return unsubscribeReschedule
    })
    setStoredValues()
    jest.spyOn(global, 'fetch')
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appStateListener = listener
      appStateRemove = jest.fn()
      return { remove: appStateRemove }
    })
    appStateListener = undefined
    rescheduleListener = undefined
    timeChangeListener = undefined
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('clears and does not resolve a city or set a notification when switched off', async () => {
    const hook = await renderHook(() => useCountdownNotification())

    await waitFor(() => expect(mockedClear).toHaveBeenCalledTimes(1))

    expect(mockedResolveCityLabel).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
    expect(mockedSet).not.toHaveBeenCalled()
    expect(hook.result.current.status).toBeNull()
  })

  it('clears without resolving a city when the notifications switch is off', async () => {
    setStoredValues({
      [PREFERENCE_KEYS.countdownEnabled]: '1',
      [PREFERENCE_KEYS.notificationPrefs]: JSON.stringify(DEFAULT_NOTIFICATION_PREFS),
    })

    await renderHook(() => useCountdownNotification({ now }))

    await waitFor(() => expect(mockedClear).toHaveBeenCalledTimes(1))
    expect(mockedResolveCityLabel).not.toHaveBeenCalled()
    expect(mockedSet).not.toHaveBeenCalled()
  })

  it('clears when switched on without cached coordinates', async () => {
    setStoredValues({
      [PREFERENCE_KEYS.countdownEnabled]: '1',
      [PREFERENCE_KEYS.latitude]: null,
    })

    await renderHook(() => useCountdownNotification({ now }))

    await waitFor(() => expect(mockedClear).toHaveBeenCalledTimes(1))

    expect(mockedResolveCityLabel).not.toHaveBeenCalled()
    expect(mockedSet).not.toHaveBeenCalled()
  })

  it('sets the notification from the resolved city and stored calculation method', async () => {
    setStoredValues({
      [PREFERENCE_KEYS.countdownEnabled]: '1',
      [PREFERENCE_KEYS.calculationMethod]: 'umm_al_qura',
    })
    const coordinates = { latitude: 30.0444, longitude: 31.2357 }

    await renderHook(() => useCountdownNotification({ now }))

    await waitFor(() => expect(mockedSet).toHaveBeenCalledTimes(1))

    expect(mockedResolveCityLabel).toHaveBeenCalledWith(coordinates, true, expect.anything(), NOW)
    expect(mockedSet).toHaveBeenCalledWith(NOW, coordinates, 'القاهرة', 'umm_al_qura')
  })

  it('queues exactly one extra sync for a reschedule request during a running sync', async () => {
    setStoredValues({ [PREFERENCE_KEYS.countdownEnabled]: '1' })
    let resolveFirst!: (city: string) => void
    mockedResolveCityLabel
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockResolvedValueOnce('الجيزة')

    const hook = await renderHook(() => useCountdownNotification({ now }))
    await waitFor(() => expect(mockedResolveCityLabel).toHaveBeenCalledTimes(1))

    rescheduleListener?.()
    expect(mockedResolveCityLabel).toHaveBeenCalledTimes(1)

    resolveFirst('القاهرة')
    await hook.result.current.sync()

    expect(mockedResolveCityLabel).toHaveBeenCalledTimes(2)
    expect(mockedSet.mock.calls.map((call) => call[2])).toEqual(['القاهرة', 'الجيزة'])
  })

  it('syncs on active and removes every subscription on unmount', async () => {
    setStoredValues({ [PREFERENCE_KEYS.countdownEnabled]: '1' })
    const hook = await renderHook(() => useCountdownNotification({ now }))
    await waitFor(() => expect(mockedSet).toHaveBeenCalledTimes(1))

    mockedResolveCityLabel.mockClear()
    appStateListener?.('active')
    await waitFor(() => expect(mockedResolveCityLabel).toHaveBeenCalledTimes(1))

    hook.unmount()

    expect(appStateRemove).toHaveBeenCalledTimes(1)
    expect(unsubscribeReschedule).toHaveBeenCalledTimes(1)
    expect(unsubscribeTimeChange).toHaveBeenCalledTimes(1)
    expect(timeChangeListener).toBeDefined()
  })
})
