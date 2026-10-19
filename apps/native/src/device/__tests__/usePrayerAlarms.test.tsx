import { act, renderHook, waitFor } from '@testing-library/react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { AppState } from 'react-native'

import { DEFAULT_NOTIFICATION_PREFS } from '@nabd/shared'

import { PREFERENCE_KEYS } from '../../preferences/db'
import {
  configureForegroundHandler,
  ExactAlarmDeniedError,
  readNotificationPermission,
} from '../notifications'
import { devicePlatform } from '../platform'
import { buildPrayerSchedule } from '../schedule'
import { setPrayerAlarmSyncOutcome, subscribePrayerReschedule } from '../prayerAlarms'
import { usePrayerAlarms } from '../usePrayerAlarms'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('../notifications', () => {
  class ExactAlarmDeniedError extends Error {
    constructor() {
      super('exact alarm access is denied')
      this.name = 'ExactAlarmDeniedError'
    }
  }

  return {
    ExactAlarmDeniedError,
    configureForegroundHandler: jest.fn(),
    readNotificationPermission: jest.fn(),
  }
})
jest.mock('../schedule', () => ({ buildPrayerSchedule: jest.fn() }))
jest.mock('../platform', () => ({
  devicePlatform: {
    cancelPrayerAlerts: jest.fn(),
    prepareNotificationDelivery: jest.fn(),
    schedulePrayerAlerts: jest.fn(),
    readExactTimingStatus: jest.fn(),
    subscribeToClockChanges: jest.fn(),
  },
}))
jest.mock('../prayerAlarms', () => ({
  setPrayerAlarmSyncOutcome: jest.fn(),
  subscribePrayerReschedule: jest.fn(),
}))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedReadPermission = readNotificationPermission as jest.MockedFunction<
  typeof readNotificationPermission
>
const mockedCancel = devicePlatform.cancelPrayerAlerts as jest.MockedFunction<
  typeof devicePlatform.cancelPrayerAlerts
>
const mockedPrepare = devicePlatform.prepareNotificationDelivery as jest.MockedFunction<
  typeof devicePlatform.prepareNotificationDelivery
>
const mockedSchedule = devicePlatform.schedulePrayerAlerts as jest.MockedFunction<
  typeof devicePlatform.schedulePrayerAlerts
>
const mockedBuildSchedule = buildPrayerSchedule as jest.MockedFunction<typeof buildPrayerSchedule>
const mockedReadExactTimingStatus = devicePlatform.readExactTimingStatus as jest.MockedFunction<
  typeof devicePlatform.readExactTimingStatus
>
const mockedSubscribeTimeChange = devicePlatform.subscribeToClockChanges as jest.MockedFunction<
  typeof devicePlatform.subscribeToClockChanges
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
const DAY_MS = 24 * 60 * 60 * 1_000
const now = () => NOW
let appStateListener:
  ((state: 'active' | 'background' | 'inactive' | 'unknown' | 'extension') => void) | undefined
let rescheduleListener: (() => void) | undefined
let timeChangeListener: (() => void) | undefined

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
    mockedCancel.mockResolvedValue('cancelled')
    mockedPrepare.mockResolvedValue('prepared')
    mockedSchedule.mockResolvedValue('scheduled')
    mockedReadExactTimingStatus.mockReturnValue({ apiLevel: 32, access: 'granted' })
    mockedBuildSchedule.mockReturnValue([alarm(101)])

    setStoredValues()
    appStateListener = undefined
    rescheduleListener = undefined
    timeChangeListener = undefined
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appStateListener = listener
      return { remove: jest.fn() } as never
    })
    mockedSubscribe.mockImplementation((listener) => {
      rescheduleListener = listener
      return jest.fn()
    })
    mockedSubscribeTimeChange.mockImplementation((listener) => {
      timeChangeListener = listener
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
    expect(mockedSchedule).not.toHaveBeenCalled()
  })

  it.each([
    ['permission', { permission: 'denied' as const }],
    ['coordinates', { [PREFERENCE_KEYS.latitude]: null }],
  ])('cancels without %s', async (_name, options) => {
    if ('permission' in options) mockedReadPermission.mockResolvedValue(options.permission)
    else setStoredValues(options)
    renderAlarms()

    await waitFor(() => expect(mockedCancel).toHaveBeenCalledTimes(1))
    expect(mockedSchedule).not.toHaveBeenCalled()
  })

  it('replaces the schedule from current preferences and stale coordinates', async () => {
    renderAlarms()

    await waitFor(() => expect(mockedSchedule).toHaveBeenCalledTimes(1))
    expect(mockedBuildSchedule).toHaveBeenCalledWith({
      coords: { latitude: 30.0444, longitude: 31.2357 },
      methodId: 'egyptian',
      notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS, enabled: true },
      now: NOW,
    })
    expect(mockedSchedule).toHaveBeenCalledWith([alarm(101)], false, NOW)
    expect(mockedConfigure).toHaveBeenCalledTimes(1)
  })

  it('schedules below API 31 without exact-alarm access', async () => {
    mockedReadExactTimingStatus.mockReturnValue({ apiLevel: 30, access: 'unknown' })

    renderAlarms()

    await waitFor(() => expect(mockedSchedule).toHaveBeenCalledTimes(1))
    expect(mockedCancel).not.toHaveBeenCalled()
    expect(mockedSetSyncOutcome).toHaveBeenLastCalledWith('ok')
  })

  it('cancels while exact-alarm access is denied and schedules after access is granted', async () => {
    mockedReadExactTimingStatus
      .mockReturnValueOnce({ apiLevel: 32, access: 'denied' })
      .mockReturnValue({ apiLevel: 32, access: 'granted' })
    const { result } = renderAlarms()

    await waitFor(() => expect(mockedCancel).toHaveBeenCalledTimes(1))
    expect(mockedSchedule).not.toHaveBeenCalled()
    expect(mockedSetSyncOutcome).toHaveBeenLastCalledWith('degraded')

    await act(async () => {
      await result.current.sync()
    })

    await waitFor(() => expect(mockedSchedule).toHaveBeenCalledTimes(1))
    expect(mockedReadExactTimingStatus).toHaveBeenCalledTimes(3)
  })

  it('cancels when exact-alarm access is revoked before replacement', async () => {
    mockedReadExactTimingStatus
      .mockReturnValueOnce({ apiLevel: 32, access: 'granted' })
      .mockReturnValueOnce({ apiLevel: 32, access: 'denied' })

    renderAlarms()

    await waitFor(() => expect(mockedCancel).toHaveBeenCalledTimes(1))
    expect(mockedSchedule).not.toHaveBeenCalled()
    expect(mockedSetSyncOutcome).toHaveBeenLastCalledWith('degraded')
  })

  it.each([
    [{ apiLevel: 32, access: 'unknown' as const }],
    [{ apiLevel: 35, access: 'denied' as const }],
  ])('fails closed for an unavailable exact-alarm state', async (snapshot) => {
    mockedReadExactTimingStatus.mockReturnValue(snapshot)

    renderAlarms()

    await waitFor(() => expect(mockedCancel).toHaveBeenCalledTimes(1))
    expect(mockedSchedule).not.toHaveBeenCalled()
    expect(mockedSetSyncOutcome).toHaveBeenLastCalledWith('degraded')
  })

  it('skips an unchanged successful schedule and retries after failure', async () => {
    mockedSchedule.mockRejectedValueOnce(new Error('failed')).mockResolvedValue('scheduled')
    const { result } = renderAlarms()

    await waitFor(() => expect(mockedSchedule).toHaveBeenCalledTimes(1))
    expect(mockedSetSyncOutcome).toHaveBeenLastCalledWith('failed')
    await act(async () => {
      await result.current.sync()
    })
    await waitFor(() => expect(mockedSchedule).toHaveBeenCalledTimes(2))
    expect(mockedSetSyncOutcome).toHaveBeenLastCalledWith('ok')

    mockedSchedule.mockClear()

    await act(async () => {
      await result.current.sync()
    })
    expect(mockedSchedule).not.toHaveBeenCalled()
  })

  it('degrades when native scheduling reports exact-alarm denial', async () => {
    mockedSchedule.mockRejectedValue(new ExactAlarmDeniedError())
    renderAlarms()

    await waitFor(() => expect(mockedCancel).toHaveBeenCalledTimes(1))
    expect(mockedSetSyncOutcome).toHaveBeenLastCalledWith('degraded')
  })

  it('serializes concurrent requests and queues one additional run', async () => {
    let resolveFirst: (() => void) | undefined
    mockedSchedule
      .mockImplementationOnce(
        () =>
          new Promise<'scheduled'>((resolve) => {
            resolveFirst = () => resolve('scheduled')
          }),
      )
      .mockResolvedValueOnce('scheduled')
    mockedBuildSchedule.mockReturnValueOnce([alarm(101)]).mockReturnValue([alarm(102)])
    const { result } = renderAlarms()

    await waitFor(() => expect(mockedSchedule).toHaveBeenCalledTimes(1))
    let first!: Promise<void>
    let second!: Promise<void>
    act(() => {
      first = result.current.sync()
      second = result.current.sync()
    })
    expect(mockedSchedule).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveFirst?.()
      await Promise.all([first, second])
    })
    await waitFor(() => expect(mockedSchedule).toHaveBeenCalledTimes(2))
  })

  it('does not lose a request at the sync completion boundary', async () => {
    let resolveFirst: (() => void) | undefined
    const firstReplacement = new Promise<'scheduled'>((resolve) => {
      resolveFirst = () => resolve('scheduled')
    })
    mockedSchedule.mockImplementationOnce(() => firstReplacement).mockResolvedValueOnce('scheduled')
    mockedBuildSchedule.mockReturnValueOnce([alarm(101)]).mockReturnValue([alarm(102)])
    const { result } = renderAlarms()

    await waitFor(() => expect(mockedSchedule).toHaveBeenCalledTimes(1))
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
    await waitFor(() => expect(mockedSchedule).toHaveBeenCalledTimes(2))
  })

  it('syncs when the app becomes active and when a reschedule is requested', async () => {
    renderAlarms()
    await waitFor(() => expect(mockedSchedule).toHaveBeenCalledTimes(1))

    mockedSchedule.mockClear()
    mockedBuildSchedule.mockReturnValue([alarm(102)])
    act(() => appStateListener?.('active'))
    await waitFor(() => expect(mockedSchedule).toHaveBeenCalledTimes(1))

    mockedSchedule.mockClear()
    mockedBuildSchedule.mockReturnValue([alarm(103)])
    act(() => rescheduleListener?.())
    await waitFor(() => expect(mockedSchedule).toHaveBeenCalledTimes(1))
  })

  it('rebuilds the schedule when the native clock changes', async () => {
    let currentTime = NOW
    const clockNow = () => currentTime
    renderHook(() => usePrayerAlarms({ now: clockNow }))

    await waitFor(() => expect(mockedSchedule).toHaveBeenCalledTimes(1))
    mockedSchedule.mockClear()
    currentTime += DAY_MS
    mockedBuildSchedule.mockReturnValue([alarm(102, currentTime + 60_000)])

    await act(async () => {
      timeChangeListener?.()
      await Promise.resolve()
    })

    await waitFor(() =>
      expect(mockedSchedule).toHaveBeenCalledWith(
        [alarm(102, currentTime + 60_000)],
        false,
        currentTime,
      ),
    )
  })
})
