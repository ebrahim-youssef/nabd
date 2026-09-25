import { act, renderHook, waitFor } from '@testing-library/react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { AppState } from 'react-native'

import { DEFAULT_NOTIFICATION_PREFS } from '@nabd/shared'

import { PREFERENCE_KEYS } from '../../preferences/db'
import {
  cancelPrayerAlarms,
  configureForegroundHandler,
  readNotificationPermission,
  replacePrayerAlarms,
} from '../notifications'
import { readExactAlarmSnapshot } from '../exactAlarm'
import { buildPrayerSchedule } from '../schedule'
import { setPrayerAlarmSyncOutcome, subscribePrayerReschedule } from '../prayerAlarms'
import { usePrayerAlarms } from '../usePrayerAlarms'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('../notifications', () => ({
  cancelPrayerAlarms: jest.fn(),
  configureForegroundHandler: jest.fn(),
  readNotificationPermission: jest.fn(),
  replacePrayerAlarms: jest.fn(),
}))
jest.mock('../schedule', () => ({ buildPrayerSchedule: jest.fn() }))
jest.mock('../exactAlarm', () => ({ readExactAlarmSnapshot: jest.fn() }))
jest.mock('../prayerAlarms', () => ({
  setPrayerAlarmSyncOutcome: jest.fn(),
  subscribePrayerReschedule: jest.fn(),
}))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedReadPermission = readNotificationPermission as jest.MockedFunction<
  typeof readNotificationPermission
>
const mockedCancel = cancelPrayerAlarms as jest.MockedFunction<typeof cancelPrayerAlarms>
const mockedReplace = replacePrayerAlarms as jest.MockedFunction<typeof replacePrayerAlarms>
const mockedBuildSchedule = buildPrayerSchedule as jest.MockedFunction<typeof buildPrayerSchedule>
const mockedReadExactAlarmSnapshot = readExactAlarmSnapshot as jest.MockedFunction<
  typeof readExactAlarmSnapshot
>
const mockedSetSyncOutcome = setPrayerAlarmSyncOutcome as jest.MockedFunction<
  typeof setPrayerAlarmSyncOutcome
>
const mockedSubscribe = subscribePrayerReschedule as jest.MockedFunction<
  typeof subscribePrayerReschedule
>
const mockedConfigure = configureForegroundHandler as jest.MockedFunction<
  typeof configureForegroundHandler
>
const mockGetFirstAsync = jest.fn()
const NOW = 1_800_000_000_000
const now = () => NOW
let appStateListener:
  ((state: 'active' | 'background' | 'inactive' | 'unknown' | 'extension') => void) | undefined
let rescheduleListener: (() => void) | undefined

function alarm(id: number, at = NOW + 60_000) {
  return {
    id,
    title: 'عنوان',
    body: 'نص',
    channelKey: 'adhan' as const,
    at,
  }
}

function setStoredValues(overrides: Record<string, string | null> = {}) {
  const values: Record<string, string | null> = {
    [PREFERENCE_KEYS.notificationPrefs]: JSON.stringify({
      ...DEFAULT_NOTIFICATION_PREFS,
      enabled: true,
    }),
    [PREFERENCE_KEYS.silentMode]: '0',
    [PREFERENCE_KEYS.calculationMethod]: 'egyptian',
    [PREFERENCE_KEYS.latitude]: '30.0444',
    [PREFERENCE_KEYS.longitude]: '31.2357',
    [PREFERENCE_KEYS.locationRecordedAt]: String(NOW - 20 * 60_000),
    ...overrides,
  }
  mockGetFirstAsync.mockImplementation(async (_source: string, key: string) => ({
    value: values[key] ?? null,
  }))
}

function renderAlarms() {
  return renderHook(() => usePrayerAlarms({ now }))
}

describe('usePrayerAlarms', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseSQLiteContext.mockReturnValue({
      getFirstAsync: mockGetFirstAsync,
    } as never)
    mockedReadPermission.mockResolvedValue('granted')
    mockedCancel.mockResolvedValue(undefined)
    mockedReplace.mockResolvedValue(undefined)
    mockedReadExactAlarmSnapshot.mockReturnValue({ apiLevel: 32, access: 'granted' })
    mockedBuildSchedule.mockReturnValue([alarm(101)])

    setStoredValues()
    appStateListener = undefined
    rescheduleListener = undefined
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appStateListener = listener
      return { remove: jest.fn() } as never
    })
    mockedSubscribe.mockImplementation((listener) => {
      rescheduleListener = listener
      return jest.fn()
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('cancels when notifications are disabled', async () => {
    setStoredValues({
      [PREFERENCE_KEYS.notificationPrefs]: JSON.stringify({
        ...DEFAULT_NOTIFICATION_PREFS,
        enabled: false,
      }),
    })
    renderAlarms()

    await waitFor(() => expect(mockedCancel).toHaveBeenCalledTimes(1))
    expect(mockedReplace).not.toHaveBeenCalled()
  })

  it.each([
    ['permission', { permission: 'denied' as const }],
    ['coordinates', { [PREFERENCE_KEYS.latitude]: null }],
  ])('cancels without %s', async (_name, options) => {
    if ('permission' in options) mockedReadPermission.mockResolvedValue(options.permission)
    else setStoredValues(options)
    renderAlarms()

    await waitFor(() => expect(mockedCancel).toHaveBeenCalledTimes(1))
    expect(mockedReplace).not.toHaveBeenCalled()
  })

  it('replaces the schedule from current preferences and stale coordinates', async () => {
    renderAlarms()

    await waitFor(() => expect(mockedReplace).toHaveBeenCalledTimes(1))
    expect(mockedBuildSchedule).toHaveBeenCalledWith({
      coords: { latitude: 30.0444, longitude: 31.2357 },
      methodId: 'egyptian',
      notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS, enabled: true },
      now: NOW,
    })
    expect(mockedReplace).toHaveBeenCalledWith([alarm(101)], false, NOW)
    expect(mockedConfigure).toHaveBeenCalledTimes(1)
  })

  it('replaces unchanged alarms when exact-alarm access is granted', async () => {
    mockedReadExactAlarmSnapshot
      .mockReturnValueOnce({ apiLevel: 32, access: 'denied' })
      .mockReturnValue({ apiLevel: 32, access: 'granted' })
    const { result } = renderAlarms()

    await waitFor(() => expect(mockedReplace).toHaveBeenCalledTimes(1))
    await act(async () => {
      await result.current.sync()
    })

    await waitFor(() => expect(mockedReplace).toHaveBeenCalledTimes(2))
    expect(mockedReadExactAlarmSnapshot).toHaveBeenCalledTimes(2)
  })

  it('skips an unchanged successful schedule and retries after failure', async () => {
    mockedReplace.mockRejectedValueOnce(new Error('failed')).mockResolvedValue(undefined)
    const { result } = renderAlarms()

    await waitFor(() => expect(mockedReplace).toHaveBeenCalledTimes(1))
    expect(mockedSetSyncOutcome).toHaveBeenLastCalledWith('failed')
    await act(async () => {
      await result.current.sync()
    })
    await waitFor(() => expect(mockedReplace).toHaveBeenCalledTimes(2))
    expect(mockedSetSyncOutcome).toHaveBeenLastCalledWith('ok')

    mockedReplace.mockClear()

    await act(async () => {
      await result.current.sync()
    })
    expect(mockedReplace).not.toHaveBeenCalled()
  })

  it('serializes concurrent requests and queues one additional run', async () => {
    let resolveFirst: (() => void) | undefined
    mockedReplace
      .mockImplementationOnce(
        () =>
          new Promise<void>((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockResolvedValueOnce(undefined)
    mockedBuildSchedule.mockReturnValueOnce([alarm(101)]).mockReturnValue([alarm(102)])
    const { result } = renderAlarms()

    await waitFor(() => expect(mockedReplace).toHaveBeenCalledTimes(1))
    let first!: Promise<void>
    let second!: Promise<void>
    act(() => {
      first = result.current.sync()
      second = result.current.sync()
    })
    expect(mockedReplace).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveFirst?.()
      await Promise.all([first, second])
    })
    await waitFor(() => expect(mockedReplace).toHaveBeenCalledTimes(2))
  })

  it('does not lose a request at the sync completion boundary', async () => {
    let resolveFirst: (() => void) | undefined
    const firstReplacement = new Promise<void>((resolve) => {
      resolveFirst = resolve
    })
    mockedReplace.mockImplementationOnce(() => firstReplacement).mockResolvedValueOnce(undefined)
    mockedBuildSchedule.mockReturnValueOnce([alarm(101)]).mockReturnValue([alarm(102)])
    const { result } = renderAlarms()

    await waitFor(() => expect(mockedReplace).toHaveBeenCalledTimes(1))
    let boundaryRequest: Promise<void> | undefined
    firstReplacement.then(() => {
      void Promise.resolve().then(() => {
        boundaryRequest = result.current.sync()
      })
    })

    await act(async () => {
      resolveFirst?.()
      await Promise.resolve()
    })

    await waitFor(() => expect(boundaryRequest).toBeDefined())
    await waitFor(() => expect(mockedReplace).toHaveBeenCalledTimes(2))
  })

  it('syncs when the app becomes active and when a reschedule is requested', async () => {
    renderAlarms()
    await waitFor(() => expect(mockedReplace).toHaveBeenCalledTimes(1))

    mockedReplace.mockClear()
    mockedBuildSchedule.mockReturnValue([alarm(102)])
    act(() => appStateListener?.('active'))
    await waitFor(() => expect(mockedReplace).toHaveBeenCalledTimes(1))

    mockedReplace.mockClear()
    mockedBuildSchedule.mockReturnValue([alarm(103)])
    act(() => rescheduleListener?.())
    await waitFor(() => expect(mockedReplace).toHaveBeenCalledTimes(1))
  })
})
