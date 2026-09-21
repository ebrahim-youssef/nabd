import { act, renderHook, waitFor } from '@testing-library/react-native'
import { useSQLiteContext } from 'expo-sqlite'

import { DEFAULT_NOTIFICATION_PREFS } from '@nabd/shared'

import { usePrayerSchedule } from '../usePrayerSchedule'
import { buildPrayerSchedule } from '../schedule'
import { useDeviceCapabilities } from '../useDeviceCapabilities'
import type { DeviceCapabilitySnapshot } from '../types'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../../preferences/db'
import nabdDeviceCapabilities from '../../../modules/nabd-device-capabilities'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('../../preferences/db', () => ({
  PREFERENCE_KEYS: {
    calculationMethod: 'nabd:prayer-calculation-method',
    latitude: 'nabd:cached-latitude',
    longitude: 'nabd:cached-longitude',
    city: 'nabd:cached-city',
    locationRecordedAt: 'nabd:cached-location-recorded-at',
    notifications: 'nabd:notification-prefs',
    alarmOnSilent: 'nabd:alarm-on-silent',
  },
  createPreferencesRepository: jest.fn(),
}))
jest.mock('../useDeviceCapabilities', () => ({ useDeviceCapabilities: jest.fn() }))
jest.mock('../../../modules/nabd-device-capabilities', () => ({
  __esModule: true,
  default: {
    cancelPrayerSchedule: jest.fn(),
    clearCountdown: jest.fn(),
    replacePrayerSchedule: jest.fn(),
    setCountdown: jest.fn(),
  },
}))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedCreatePreferencesRepository = createPreferencesRepository as jest.MockedFunction<
  typeof createPreferencesRepository
>
const mockedUseDeviceCapabilities = useDeviceCapabilities as jest.MockedFunction<
  typeof useDeviceCapabilities
>

const read = jest.fn()
const write = jest.fn()
const native = nabdDeviceCapabilities as unknown as {
  cancelPrayerSchedule: jest.Mock
  clearCountdown: jest.Mock
  replacePrayerSchedule: jest.Mock
  setCountdown: jest.Mock
}

describe('usePrayerSchedule hydration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseSQLiteContext.mockReturnValue({} as ReturnType<typeof useSQLiteContext>)
    mockedCreatePreferencesRepository.mockReturnValue({ read, write, clear: jest.fn() })
    mockedUseDeviceCapabilities.mockReturnValue({
      snapshot: undefined,
      status: undefined,
      cachedLocation: { latitude: 30, longitude: 31, city: 'القاهرة', recordedAt: 1 },
      isLoading: false,
      isRequestingLocation: false,
      error: undefined,
      actionError: undefined,
      refresh: jest.fn(async () => undefined),
      requestLocation: jest.fn(),
      setNotificationsEnabled: jest.fn(),
      handleAction: jest.fn(),
      retryLastAction: jest.fn(),
    })
    native.cancelPrayerSchedule.mockResolvedValue(undefined)
    native.clearCountdown.mockResolvedValue(undefined)
    native.replacePrayerSchedule.mockResolvedValue({
      armed: true,
      persisted: true,
      accepted: true,
      channelCompatibility: 'ready',
    })
    read.mockImplementation(async (key: string) => {
      if (key === PREFERENCE_KEYS.notifications) return null
      return null
    })
  })

  it('leaves loading and exposes safe defaults when preference hydration rejects', async () => {
    const cause = new Error('sqlite unavailable')
    read.mockRejectedValue(cause)

    const { result } = renderHook(() => usePrayerSchedule())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBe(cause)
    expect(result.current.notificationPrefs).toEqual(DEFAULT_NOTIFICATION_PREFS)
    expect(native.replacePrayerSchedule).not.toHaveBeenCalled()
  })

  it('does not arm a schedule when persisted notification JSON is malformed', async () => {
    read.mockImplementation(async (key: string) =>
      key === PREFERENCE_KEYS.notifications ? '{malformed' : null,
    )

    const { result } = renderHook(() => usePrayerSchedule())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.sync()
    })

    expect(native.replacePrayerSchedule).not.toHaveBeenCalled()
    expect(native.cancelPrayerSchedule).toHaveBeenCalled()
  })

  it('reads the current SQLite location when rescheduling after acquisition', async () => {
    const enabledPrefs = { ...DEFAULT_NOTIFICATION_PREFS, enabled: true }
    mockedUseDeviceCapabilities.mockReturnValue({
      snapshot: undefined,
      status: undefined,
      cachedLocation: { latitude: 40.7128, longitude: -74.006, city: 'نيويورك', recordedAt: 1 },
      isLoading: false,
      isRequestingLocation: false,
      error: undefined,
      actionError: undefined,
      refresh: jest.fn(async () => undefined),
      requestLocation: jest.fn(),
      setNotificationsEnabled: jest.fn(),
      handleAction: jest.fn(),
      retryLastAction: jest.fn(),
    })
    read.mockImplementation(async (key: string) => {
      if (key === PREFERENCE_KEYS.notifications) return JSON.stringify(enabledPrefs)
      if (key === PREFERENCE_KEYS.latitude) return '30.0444'
      if (key === PREFERENCE_KEYS.longitude) return '31.2357'
      if (key === PREFERENCE_KEYS.locationRecordedAt) return '1000'
      if (key === PREFERENCE_KEYS.city) return 'القاهرة'
      if (key === PREFERENCE_KEYS.calculationMethod) return 'egyptian'
      return null
    })

    const { result } = renderHook(() => usePrayerSchedule())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.sync()
    })

    const [options] = native.replacePrayerSchedule.mock.calls.at(-1) as [
      { alarms: ReturnType<typeof buildPrayerSchedule>['alarms'] },
    ]
    const current = buildPrayerSchedule({
      coords: { latitude: 30.0444, longitude: 31.2357 },
      methodId: 'egyptian',
      notificationPrefs: enabledPrefs,
      now: Date.now(),
    })
    const stale = buildPrayerSchedule({
      coords: { latitude: 40.7128, longitude: -74.006 },
      methodId: 'egyptian',
      notificationPrefs: enabledPrefs,
      now: Date.now(),
    })
    expect(options.alarms).toEqual(current.alarms)
    expect(options.alarms).not.toEqual(stale.alarms)
  })

  it('rolls back the persisted notification switch when native schedule acceptance fails', async () => {
    const enabledPrefs = {
      ...DEFAULT_NOTIFICATION_PREFS,
      enabled: true,
    }
    read.mockImplementation(async (key: string) => {
      if (key === PREFERENCE_KEYS.notifications) return JSON.stringify(enabledPrefs)
      if (key === PREFERENCE_KEYS.calculationMethod) return 'egyptian'
      return null
    })
    native.replacePrayerSchedule.mockResolvedValue({
      armed: false,
      persisted: false,
      accepted: false,
      channelCompatibility: 'missing',
      reason: 'channelsUnavailable',
    })

    const { result } = renderHook(() => usePrayerSchedule())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.setNotificationEnabled(true)
    })

    expect(write).toHaveBeenLastCalledWith(
      PREFERENCE_KEYS.notifications,
      JSON.stringify({ ...enabledPrefs, enabled: false }),
      expect.any(Number),
    )
    expect(result.current.lastScheduleResult?.accepted).toBe(false)
    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('rolls back notification disabling when native cleanup fails', async () => {
    const enabledPrefs = { ...DEFAULT_NOTIFICATION_PREFS, enabled: true }
    const cause = new Error('schedule cleanup failed')
    read.mockImplementation(async (key: string) =>
      key === PREFERENCE_KEYS.notifications ? JSON.stringify(enabledPrefs) : null,
    )
    native.cancelPrayerSchedule.mockRejectedValue(cause)

    const { result } = renderHook(() => usePrayerSchedule())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.setNotificationEnabled(false)
    })

    expect(result.current.notificationPrefs.enabled).toBe(true)
    expect(result.current.error).toBe(cause)
    expect(write).toHaveBeenLastCalledWith(
      PREFERENCE_KEYS.notifications,
      JSON.stringify(enabledPrefs),
      expect.any(Number),
    )
  })

  it('re-arms the previous schedule when disabling fails after cancellation', async () => {
    const enabledPrefs = { ...DEFAULT_NOTIFICATION_PREFS, enabled: true }
    const cause = new Error('countdown cleanup failed')
    read.mockImplementation(async (key: string) =>
      key === PREFERENCE_KEYS.notifications ? JSON.stringify(enabledPrefs) : null,
    )
    native.clearCountdown.mockRejectedValue(cause)

    const { result } = renderHook(() => usePrayerSchedule())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.setNotificationEnabled(false)
    })

    expect(native.cancelPrayerSchedule).toHaveBeenCalled()
    expect(native.replacePrayerSchedule).toHaveBeenCalled()
    expect(result.current.notificationPrefs.enabled).toBe(true)
    expect(result.current.error).toBe(cause)
  })

  it('leaves notifications disabled when re-arming after cleanup failure is rejected', async () => {
    const enabledPrefs = { ...DEFAULT_NOTIFICATION_PREFS, enabled: true }
    const cleanupFailure = new Error('countdown cleanup failed')
    read.mockImplementation(async (key: string) =>
      key === PREFERENCE_KEYS.notifications ? JSON.stringify(enabledPrefs) : null,
    )
    native.clearCountdown.mockRejectedValue(cleanupFailure)
    native.replacePrayerSchedule.mockRejectedValue(new Error('schedule re-arm failed'))

    const { result } = renderHook(() => usePrayerSchedule())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.setNotificationEnabled(false)
    })

    expect(result.current.notificationPrefs.enabled).toBe(false)
    expect(result.current.error).toBe(cleanupFailure)
    expect(native.cancelPrayerSchedule).toHaveBeenCalledTimes(2)
    expect(write).toHaveBeenLastCalledWith(
      PREFERENCE_KEYS.notifications,
      JSON.stringify({ ...enabledPrefs, enabled: false }),
      expect.any(Number),
    )
  })

  it('keeps enable failure rollback safe when rollback persistence and cancellation fail', async () => {
    const cause = new Error('schedule arm failed')
    const rollbackWriteFailure = new Error('rollback persistence failed')
    let notificationReads = 0
    read.mockImplementation(async (key: string) => {
      if (key !== PREFERENCE_KEYS.notifications) return null
      notificationReads += 1
      return notificationReads === 1
        ? null
        : JSON.stringify({ ...DEFAULT_NOTIFICATION_PREFS, enabled: true })
    })
    native.replacePrayerSchedule.mockRejectedValue(cause)
    native.cancelPrayerSchedule.mockRejectedValue(new Error('cancellation failed'))
    write
      .mockImplementationOnce(async () => undefined)
      .mockImplementationOnce(async () => {
        throw rollbackWriteFailure
      })

    const { result } = renderHook(() => usePrayerSchedule())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.setNotificationEnabled(true)
    })

    expect(result.current.notificationPrefs.enabled).toBe(false)
    expect(result.current.error).toBe(cause)
  })

  it('keeps enabled preferences when Android exact-alarm access is pending but accepted for persistence', async () => {
    const enabledPrefs = { ...DEFAULT_NOTIFICATION_PREFS, enabled: true }
    read.mockImplementation(async (key: string) => {
      if (key === PREFERENCE_KEYS.notifications) return JSON.stringify(enabledPrefs)
      if (key === PREFERENCE_KEYS.calculationMethod) return 'egyptian'
      return null
    })
    native.replacePrayerSchedule.mockResolvedValue({
      armed: false,
      persisted: true,
      accepted: true,
      channelCompatibility: 'ready',
      reason: 'exactAlarmDenied',
    })

    const { result } = renderHook(() => usePrayerSchedule())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.sync()
    })

    expect(result.current.notificationPrefs.enabled).toBe(true)
    expect(result.current.lastScheduleResult).toMatchObject({
      accepted: true,
      reason: 'exactAlarmDenied',
    })
    expect(result.current.error).toBeUndefined()
  })

  it('rolls back a notification moment when native schedule replacement fails', async () => {
    const enabledPrefs = { ...DEFAULT_NOTIFICATION_PREFS, enabled: true }
    const cause = new Error('schedule replacement failed')
    read.mockImplementation(async (key: string) => {
      if (key === PREFERENCE_KEYS.notifications) return JSON.stringify(enabledPrefs)
      if (key === PREFERENCE_KEYS.calculationMethod) return 'egyptian'
      return null
    })
    native.replacePrayerSchedule.mockRejectedValue(cause)

    const { result } = renderHook(() => usePrayerSchedule())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.setNotificationMoment('atAdhan', false)
    })

    expect(result.current.notificationPrefs.atAdhan).toBe(true)
    expect(result.current.error).toBe(cause)
    expect(write).toHaveBeenLastCalledWith(
      PREFERENCE_KEYS.notifications,
      JSON.stringify(enabledPrefs),
      expect.any(Number),
    )
  })

  it('rolls back silent-mode routing when native schedule replacement fails', async () => {
    const enabledPrefs = { ...DEFAULT_NOTIFICATION_PREFS, enabled: true }
    const cause = new Error('silent-mode schedule replacement failed')
    read.mockImplementation(async (key: string) => {
      if (key === PREFERENCE_KEYS.notifications) return JSON.stringify(enabledPrefs)
      if (key === PREFERENCE_KEYS.calculationMethod) return 'egyptian'
      if (key === PREFERENCE_KEYS.alarmOnSilent) return 'false'
      return null
    })
    native.replacePrayerSchedule.mockRejectedValue(cause)

    const { result } = renderHook(() => usePrayerSchedule())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.setAlarmOnSilent(true)
    })

    expect(result.current.alarmOnSilent).toBe(false)
    expect(result.current.error).toBe(cause)
    expect(write).toHaveBeenLastCalledWith(
      PREFERENCE_KEYS.alarmOnSilent,
      'false',
      expect.any(Number),
    )
  })

  it('surfaces countdown native failures without leaving a false success state', async () => {
    const cause = new Error('countdown unavailable')
    mockedUseDeviceCapabilities.mockReturnValue({
      snapshot: { countdown: { enabled: false } } as DeviceCapabilitySnapshot,
      status: undefined,
      cachedLocation: { latitude: 30, longitude: 31, city: 'القاهرة', recordedAt: 1 },
      isLoading: false,
      isRequestingLocation: false,
      error: undefined,
      actionError: undefined,
      refresh: jest.fn(async () => undefined),
      requestLocation: jest.fn(),
      setNotificationsEnabled: jest.fn(),
      handleAction: jest.fn(),
      retryLastAction: jest.fn(),
    })
    native.setCountdown.mockRejectedValue(cause)

    const { result } = renderHook(() => usePrayerSchedule())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.setCountdownEnabled(true)
    })

    expect(result.current.lastCountdownResult).toBeUndefined()
    expect(result.current.error).toBe(cause)
  })
})
