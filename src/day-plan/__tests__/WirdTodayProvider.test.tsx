import { act, render, renderHook, screen, waitFor } from '@testing-library/react-native'
import { AppState, View } from 'react-native'
import type { AppStateStatus } from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import type { PropsWithChildren } from 'react'

import { useLocationCapability } from '../../device/useLocationCapability'
import { previousDay, toDayId } from '../../lib/day'
import { logger } from '../../observability/logger'
import {
  computeDayTimes,
  currentTimeZone,
  dateForCalendarDayInTimeZone,
  DEFAULT_METHOD_ID,
} from '../../prayer-times/logic'
import { resolveWirdDay } from '../logic'
import { WirdTodayProvider, useRefreshWirdDay, useWirdToday } from '../WirdTodayProvider'

const mockReadPreference = jest.fn<Promise<string | null>, [string]>(async () => null)
const mockRefreshLocation = jest.fn<Promise<void>, [options?: { force?: boolean }]>(
  async () => undefined,
)
let mockTimeChangeListener: (() => void) | undefined
const MINUTE_MS = 60_000
const READINESS_TIMEOUT_MS = 3_000

const mockDatabase = {}
jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn(() => mockDatabase) }))
jest.mock('../../device/useLocationCapability', () => ({
  useLocationCapability: jest.fn(() => ({
    coordinates: { latitude: 30.04, longitude: 31.24 },
    hasReadCache: true,
    refresh: mockRefreshLocation,
  })),
}))
jest.mock('../../device/exactAlarm', () => ({
  subscribeTimeChange: jest.fn((listener: () => void) => {
    mockTimeChangeListener = listener
    return () => undefined
  }),
}))
jest.mock('../../preferences/db', () => ({
  PREFERENCE_KEYS: { calculationMethod: 'calculation-method' },
  createPreferencesRepository: () => ({ read: (key: string) => mockReadPreference(key) }),
}))

const mockedUseLocationCapability = jest.mocked(useLocationCapability)

const wrapper = ({ children }: PropsWithChildren) => (
  <WirdTodayProvider>{children}</WirdTodayProvider>
)

function WirdDayChild() {
  return <View accessibilityLabel={useWirdToday()} testID="provider-child" />
}

describe('useWirdToday', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-06-10T00:00:00.000Z'))
    mockReadPreference.mockReset().mockResolvedValue(null)
    mockedUseLocationCapability.mockReturnValue({
      coordinates: { latitude: 30.04, longitude: 31.24 },
      hasReadCache: true,
      refresh: mockRefreshLocation,
    } as unknown as ReturnType<typeof useLocationCapability>)
    mockRefreshLocation.mockClear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('holds children until both location cache and method preference are ready', async () => {
    mockedUseLocationCapability.mockReturnValue({
      coordinates: null,
      hasReadCache: false,
      refresh: mockRefreshLocation,
    } as unknown as ReturnType<typeof useLocationCapability>)
    let resolvePreference: (value: string | null) => void = () => undefined
    mockReadPreference.mockReturnValueOnce(
      new Promise((resolve) => {
        resolvePreference = resolve
      }),
    )
    const view = render(
      <WirdTodayProvider>
        <View testID="provider-child" />
      </WirdTodayProvider>,
    )

    expect(screen.queryByTestId('provider-child')).toBeNull()
    await waitFor(() => expect(mockReadPreference).toHaveBeenCalledTimes(1))
    await act(async () => {
      resolvePreference(null)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.queryByTestId('provider-child')).toBeNull()

    mockedUseLocationCapability.mockReturnValue({
      coordinates: { latitude: 30.04, longitude: 31.24 },
      hasReadCache: true,
      refresh: mockRefreshLocation,
    } as unknown as ReturnType<typeof useLocationCapability>)
    await act(async () => {
      view.rerender(
        <WirdTodayProvider>
          <View testID="provider-child" />
        </WirdTodayProvider>,
      )
    })
    expect(await screen.findByTestId('provider-child')).toBeTruthy()
  })

  it('first renders the previous wird day at 01:00 with a saved location', async () => {
    const timeZone = currentTimeZone()
    const now = new Date(2026, 5, 10, 1).getTime()
    jest.setSystemTime(now)
    const times = computeDayTimes(
      { latitude: 30.04, longitude: 31.24 },
      dateForCalendarDayInTimeZone(now, timeZone),
    )
    expect(times.fajr).toBeGreaterThan(now)
    const { result } = renderHook(() => useWirdToday(), { wrapper })
    await waitFor(() => expect(result.current).toBe(previousDay(toDayId(new Date(now)))))
  })

  it('returns the calendar day after Fajr', async () => {
    const instant = new Date(2026, 5, 10, 1).getTime()
    const timeZone = currentTimeZone()
    const times = computeDayTimes(
      { latitude: 30.04, longitude: 31.24 },
      dateForCalendarDayInTimeZone(instant, timeZone),
    )
    jest.setSystemTime(times.fajr + 1)
    const { result } = renderHook(() => useWirdToday(), { wrapper })

    await waitFor(() => expect(result.current).toBe(toDayId(new Date(times.fajr + 1))))
  })

  it('changes the wird day at the Fajr boundary millisecond', async () => {
    const timeZone = currentTimeZone()
    const now = new Date(2026, 5, 10, 1).getTime()
    jest.setSystemTime(now)
    const times = computeDayTimes(
      { latitude: 30.04, longitude: 31.24 },
      dateForCalendarDayInTimeZone(now, timeZone),
    )
    const { result } = renderHook(() => useWirdToday(), { wrapper })
    const today = toDayId(new Date(now))

    await waitFor(() => expect(result.current).toBe(previousDay(today)))
    await act(async () => {
      jest.advanceTimersByTime(times.fajr - Date.now() - 1)
    })
    expect(result.current).toBe(previousDay(today))

    await act(async () => {
      jest.advanceTimersByTime(1)
    })
    expect(result.current).toBe(today)
  })

  it('changes the no-location wird day at local midnight', async () => {
    mockedUseLocationCapability.mockReturnValue({
      coordinates: null,
      hasReadCache: true,
      refresh: mockRefreshLocation,
    } as unknown as ReturnType<typeof useLocationCapability>)
    const now = new Date(2026, 5, 10, 23, 0).getTime()
    jest.setSystemTime(now)
    const { result } = renderHook(() => useWirdToday(), { wrapper })

    await waitFor(() => expect(result.current).toBe(toDayId(new Date(now))))
    await act(async () => {
      jest.advanceTimersByTime(new Date(2026, 5, 11).getTime() - Date.now() - 1)
    })
    expect(result.current).toBe('2026-06-10')

    await act(async () => {
      jest.advanceTimersByTime(1)
    })
    expect(result.current).toBe('2026-06-11')
  })

  it('uses the calendar day at 01:00 when a failed cache read leaves no coordinates', async () => {
    mockedUseLocationCapability.mockReturnValue({
      coordinates: null,
      hasReadCache: true,
      refresh: mockRefreshLocation,
    } as unknown as ReturnType<typeof useLocationCapability>)
    const instant = new Date(2026, 5, 10, 1)
    jest.setSystemTime(instant)
    const { result } = renderHook(() => useWirdToday(), { wrapper })
    await waitFor(() => expect(result.current).toBe(toDayId(instant)))
    expect(useSQLiteContext).toHaveBeenCalled()
  })

  it('renders with the default calculation method when its preference read fails', async () => {
    jest.spyOn(logger, 'error').mockImplementation(() => undefined)
    mockReadPreference.mockRejectedValueOnce(new Error('preference read failed'))
    const { result } = renderHook(() => useWirdToday(), { wrapper })

    await waitFor(() => expect(result.current).toBeTruthy())
  })

  it('releases children and logs when the saved-location read never settles', async () => {
    const logError = jest.spyOn(logger, 'error').mockImplementation(() => undefined)
    mockedUseLocationCapability.mockReturnValue({
      coordinates: null,
      hasReadCache: false,
      refresh: mockRefreshLocation,
    } as unknown as ReturnType<typeof useLocationCapability>)
    render(
      <WirdTodayProvider>
        <WirdDayChild />
      </WirdTodayProvider>,
    )

    expect(screen.queryByTestId('provider-child')).toBeNull()
    await act(async () => {
      jest.advanceTimersByTime(READINESS_TIMEOUT_MS)
    })
    expect(screen.getByTestId('provider-child').props.accessibilityLabel).toBe(toDayId(new Date()))
    expect(logError).toHaveBeenCalledWith(
      'Native wird-day readiness timed out waiting for saved-location cache read',
      expect.any(Error),
      { read: 'location-cache' },
    )
  })

  it('releases children and logs when the method preference read never settles', async () => {
    const logError = jest.spyOn(logger, 'error').mockImplementation(() => undefined)
    mockReadPreference.mockReturnValueOnce(new Promise<string | null>(() => undefined))
    const now = Date.now()
    render(
      <WirdTodayProvider>
        <WirdDayChild />
      </WirdTodayProvider>,
    )

    expect(screen.queryByTestId('provider-child')).toBeNull()
    await act(async () => {
      jest.advanceTimersByTime(READINESS_TIMEOUT_MS)
    })
    const expectedDay = resolveWirdDay(
      now,
      computeDayTimes(
        { latitude: 30.04, longitude: 31.24 },
        dateForCalendarDayInTimeZone(now, currentTimeZone()),
        DEFAULT_METHOD_ID,
      ),
    )
    expect(screen.getByTestId('provider-child').props.accessibilityLabel).toBe(expectedDay)
    expect(logError).toHaveBeenCalledWith(
      'Native wird-day readiness timed out waiting for calculation-method preference read',
      expect.any(Error),
      { read: 'calculation-method-preference' },
    )
  })

  it('does not reread the method preference on the minute timer', async () => {
    renderHook(() => useWirdToday(), { wrapper })
    await waitFor(() => expect(mockReadPreference).toHaveBeenCalledTimes(1))

    await act(async () => {
      jest.advanceTimersByTime(MINUTE_MS)
    })

    expect(mockReadPreference).toHaveBeenCalledTimes(1)
  })

  it('rereads method and location settings when the provider refresh is requested', async () => {
    const { result } = renderHook(() => useRefreshWirdDay(), { wrapper })
    await waitFor(() => expect(result.current).toBeInstanceOf(Function))
    expect(mockReadPreference).toHaveBeenCalledTimes(1)

    await act(async () => result.current())
    await waitFor(() => expect(mockReadPreference).toHaveBeenCalledTimes(2))
    expect(mockRefreshLocation).toHaveBeenCalledWith({ force: false })
  })

  it('rereads the method preference on app resume and time changes', async () => {
    let appStateListener: ((state: AppStateStatus) => void) | undefined
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      appStateListener = listener
      return { remove: jest.fn() } as never
    })
    renderHook(() => useWirdToday(), { wrapper })
    await waitFor(() => expect(mockReadPreference).toHaveBeenCalledTimes(1))

    await act(async () => appStateListener?.('active'))
    await waitFor(() => expect(mockReadPreference).toHaveBeenCalledTimes(2))
    await act(async () => mockTimeChangeListener?.())
    await waitFor(() => expect(mockReadPreference).toHaveBeenCalledTimes(3))
  })
})
