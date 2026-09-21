import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'

import { WIRD_LEVELS } from '@nabd/shared'
import { useSQLiteContext } from 'expo-sqlite'
import { deviceCopy } from '../../device/copy'

import { SettingsRoute } from '../SettingsRoute'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../../preferences/db'
import { useWirdLevel } from '../../wird/useWirdLevel'
import { useWirdRepository } from '../../wird/useWirdRepository'

const mockSetColorScheme = jest.fn()

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('nativewind', () => ({ useColorScheme: () => ({ setColorScheme: mockSetColorScheme }) }))
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: jest.fn(),
}))
jest.mock('lucide-react-native', () => ({ ArrowRight: () => null, Check: () => null }))
jest.mock('../../preferences/db', () => ({
  PREFERENCE_KEYS: {
    celebratedDay: 'nabd:celebrated-day',
    calculationMethod: 'nabd:prayer-calculation-method',
    latitude: 'nabd:cached-latitude',
    longitude: 'nabd:cached-longitude',
    city: 'nabd:cached-city',
    locationRecordedAt: 'nabd:cached-location-recorded-at',
    notifications: 'nabd:notification-prefs',
    alarmOnSilent: 'nabd:alarm-on-silent',
    theme: 'nabd:theme',
    mode: 'nabd:mode',
  },
  readStoredTheme: (value: string | null) => (value === 'dark' ? 'dark' : 'light'),
  readStoredMode: (value: string | null) => (value === 'modern' ? 'modern' : 'classic'),
  createPreferencesRepository: jest.fn(),
}))
jest.mock('../../wird/useWirdRepository', () => ({ useWirdRepository: jest.fn() }))
jest.mock('../../wird/useWirdLevel', () => ({ useWirdLevel: jest.fn() }))
jest.mock('../../device/useDeviceCapabilities', () => ({
  useDeviceCapabilities: jest.fn(),
}))
jest.mock('../../device/usePrayerSchedule', () => ({
  usePrayerSchedule: jest.fn(),
}))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedCreatePreferencesRepository = createPreferencesRepository as jest.MockedFunction<
  typeof createPreferencesRepository
>
const mockedUseWirdRepository = useWirdRepository as jest.MockedFunction<typeof useWirdRepository>
const mockedUseWirdLevel = useWirdLevel as jest.MockedFunction<typeof useWirdLevel>
const { useDeviceCapabilities } = jest.requireMock('../../device/useDeviceCapabilities') as {
  useDeviceCapabilities: jest.Mock
}
const { usePrayerSchedule } = jest.requireMock('../../device/usePrayerSchedule') as {
  usePrayerSchedule: jest.Mock
}

const readPreference = jest.fn()
const writePreference = jest.fn()
const setWirdLevel = jest.fn()
const scheduleSync = jest.fn()
const scheduleSetNotificationEnabled = jest.fn()

describe('SettingsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-09-20T12:00:00.000Z'))
    mockedUseSQLiteContext.mockReturnValue({} as ReturnType<typeof useSQLiteContext>)
    mockedCreatePreferencesRepository.mockReturnValue({
      read: readPreference,
      write: writePreference,
      clear: jest.fn(),
    })
    readPreference.mockImplementation(async (key: string) => {
      const values: Record<string, string> = {
        [PREFERENCE_KEYS.theme]: 'dark',
        [PREFERENCE_KEYS.mode]: 'modern',
        [PREFERENCE_KEYS.calculationMethod]: 'umm_al_qura',
      }
      return values[key] ?? null
    })
    mockedUseWirdRepository.mockReturnValue({
      listVersions: jest.fn(async () => [
        {
          id: 'v1',
          effectiveFrom: '2026-09-20',
          definition: WIRD_LEVELS[0].wird,
          createdAt: 1,
        },
      ]),
      getDayEntries: jest.fn(),
      getMonthEntries: jest.fn(),
      getEntriesInRange: jest.fn(),
      getAllEntries: jest.fn(),
      addVersion: jest.fn(),
      appendEntry: jest.fn(),
      setWirdLevel,
    })
    setWirdLevel.mockResolvedValue({ ok: true, value: undefined })
    mockedUseWirdLevel.mockReturnValue({
      currentLevelId: 'level-1',
      canChangeLevel: true,
      changeLevel: jest.fn(async (levelId, today, now) => {
        const selectedLevel = WIRD_LEVELS.find((level) => level.id === levelId)
        if (selectedLevel) await setWirdLevel(selectedLevel.wird, today, now)
        return { ok: true as const, value: null }
      }),
      isLoading: false,
    })
    useDeviceCapabilities.mockReturnValue({
      snapshot: undefined,
      status: undefined,
      cachedLocation: null,
      isLoading: false,
      isRequestingLocation: false,
      error: undefined,
      refresh: jest.fn(async () => undefined),
      requestLocation: jest.fn(async () => ({ ok: false, reason: 'unavailable' })),
      setNotificationsEnabled: jest.fn(async () => undefined),
      handleAction: jest.fn(async () => undefined),
      actionError: undefined,
      retryLastAction: jest.fn(async () => undefined),
    })
    scheduleSync.mockResolvedValue(undefined)
    scheduleSetNotificationEnabled.mockResolvedValue(undefined)
    usePrayerSchedule.mockReturnValue({
      notificationPrefs: {
        enabled: false,
        beforeAdhan: true,
        atAdhan: true,
        atIqamah: true,
        morningAdhkar: true,
        eveningAdhkar: true,
      },
      alarmOnSilent: false,
      isLoading: false,
      error: undefined,
      sync: scheduleSync,
      setNotificationEnabled: scheduleSetNotificationEnabled,
      setNotificationMoment: jest.fn(async () => undefined),
      setAlarmOnSilent: jest.fn(async () => undefined),
      setCountdownEnabled: jest.fn(async () => undefined),
      cancel: jest.fn(async () => undefined),
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders persisted controls and writes changes for appearance, method, and tomorrow level', async () => {
    const { unmount } = render(<SettingsRoute />)

    await waitFor(() =>
      expect(screen.getByTestId('theme-dark').props.accessibilityState.selected).toBe(true),
    )
    await waitFor(() =>
      expect(screen.getByTestId('level-level-1').props.accessibilityState.selected).toBe(true),
    )
    expect(screen.getByTestId('theme-dark').props.accessibilityState.selected).toBe(true)
    expect(screen.getByTestId('mode-modern').props.accessibilityState.selected).toBe(true)
    expect(screen.getByTestId('method-umm_al_qura').props.accessibilityState.selected).toBe(true)

    fireEvent.press(screen.getByTestId('theme-light'))
    fireEvent.press(screen.getByTestId('mode-classic'))
    fireEvent.press(screen.getByTestId('method-egyptian'))
    fireEvent.press(screen.getByTestId('level-level-2'))

    await waitFor(() => {
      expect(writePreference).toHaveBeenCalledWith(
        PREFERENCE_KEYS.theme,
        'light',
        expect.any(Number),
      )
      expect(writePreference).toHaveBeenCalledWith(
        PREFERENCE_KEYS.mode,
        'classic',
        expect.any(Number),
      )
      expect(writePreference).toHaveBeenCalledWith(
        PREFERENCE_KEYS.calculationMethod,
        'egyptian',
        expect.any(Number),
      )
      expect(setWirdLevel).toHaveBeenCalledWith(
        WIRD_LEVELS[1].wird,
        '2026-09-20',
        expect.any(Number),
      )
    })
    await waitFor(() => expect(scheduleSync).toHaveBeenCalled())
    unmount()
  })

  it('surfaces an Arabic fallback when settings hydration fails', async () => {
    readPreference.mockRejectedValue(new Error('sqlite unavailable'))

    render(<SettingsRoute />)

    await waitFor(() => expect(screen.getByTestId('settings-hydration-error')).toBeTruthy())
    expect(screen.getByTestId('settings-hydration-error').props.children).toBe(
      deviceCopy.errors.preferencesReadFailed,
    )
  })

  it('surfaces a retry action when a native device action fails', async () => {
    const retryLastAction = jest.fn(async () => 'retry-location' as const)
    useDeviceCapabilities.mockReturnValue({
      snapshot: undefined,
      status: undefined,
      cachedLocation: null,
      isLoading: false,
      isRequestingLocation: false,
      error: undefined,
      actionError: new Error('native failure'),
      refresh: jest.fn(async () => undefined),
      requestLocation: jest.fn(async () => ({ ok: false, reason: 'unavailable' })),
      setNotificationsEnabled: jest.fn(async () => undefined),
      handleAction: jest.fn(async () => undefined),
      retryLastAction,
    })

    render(<SettingsRoute />)

    await waitFor(() =>
      expect(screen.getByTestId('theme-dark').props.accessibilityState.selected).toBe(true),
    )
    expect(screen.getByText(deviceCopy.errors.actionFailed)).toBeTruthy()
    await act(async () => {
      fireEvent.press(screen.getByTestId('settings-device-action-retry'))
    })
    await waitFor(() => expect(retryLastAction).toHaveBeenCalled())
    await waitFor(() => expect(scheduleSync).toHaveBeenCalled())
  })

  it('arms prayer notifications through the prayer schedule action', async () => {
    const handleAction = jest.fn(async () => undefined)
    useDeviceCapabilities.mockReturnValue({
      snapshot: undefined,
      status: {
        notifications: {
          capability: 'notifications',
          state: 'disabled',
          message: 'التنبيهات متوقفة',
          action: { type: 'enable-notifications', label: 'تفعيل التنبيهات' },
        },
        exactAlarm: {
          capability: 'exact-alarm',
          state: 'not-required',
          message: '',
          action: null,
        },
        location: {
          capability: 'location',
          state: 'ready',
          source: 'fresh',
          city: 'available',
          message: '',
          action: null,
        },
        countdown: {
          capability: 'countdown',
          state: 'disabled',
          message: '',
          action: null,
        },
        battery: {
          capability: 'battery',
          state: 'ready',
          message: '',
          action: null,
        },
      },
      cachedLocation: null,
      isLoading: false,
      isRequestingLocation: false,
      error: undefined,
      actionError: undefined,
      refresh: jest.fn(async () => undefined),
      requestLocation: jest.fn(async () => ({ ok: false, reason: 'unavailable' })),
      setNotificationsEnabled: jest.fn(async () => undefined),
      handleAction,
      retryLastAction: jest.fn(async () => undefined),
    })

    render(<SettingsRoute />)

    await waitFor(() => expect(screen.getByTestId('device-notifications-status-action')).toBeTruthy())
    fireEvent.press(screen.getByTestId('device-notifications-status-action'))

    await waitFor(() => expect(scheduleSetNotificationEnabled).toHaveBeenCalledWith(true))
    expect(handleAction).not.toHaveBeenCalled()
  })

  it('resyncs prayer alarms after a successful Settings location action', async () => {
    const requestLocation = jest.fn(async () => ({
      ok: true as const,
      coords: { latitude: 30.0444, longitude: 31.2357 },
      cached: false as const,
    }))
    useDeviceCapabilities.mockReturnValue({
      snapshot: undefined,
      status: {
        notifications: {
          capability: 'notifications',
          state: 'ready',
          message: '',
          action: null,
        },
        exactAlarm: {
          capability: 'exact-alarm',
          state: 'not-required',
          message: '',
          action: null,
        },
        location: {
          capability: 'location',
          state: 'city-required',
          message: '',
          action: { type: 'retry-location', label: 'تحديث الموقع' },
        },
        countdown: {
          capability: 'countdown',
          state: 'disabled',
          message: '',
          action: null,
        },
        battery: {
          capability: 'battery',
          state: 'ready',
          message: '',
          action: null,
        },
      },
      cachedLocation: null,
      isLoading: false,
      isRequestingLocation: false,
      error: undefined,
      actionError: undefined,
      refresh: jest.fn(async () => undefined),
      requestLocation,
      setNotificationsEnabled: jest.fn(async () => undefined),
      handleAction: jest.fn(async () => undefined),
      retryLastAction: jest.fn(async () => undefined),
    })

    render(<SettingsRoute />)

    await waitFor(() => expect(screen.getByTestId('device-location-status-action')).toBeTruthy())
    fireEvent.press(screen.getByTestId('device-location-status-action'))

    await waitFor(() => expect(requestLocation).toHaveBeenCalled())
    expect(scheduleSync).toHaveBeenCalled()
  })

  it('renders the Arabic schedule rejection message', async () => {
    usePrayerSchedule.mockReturnValue({
      notificationPrefs: {
        enabled: false,
        beforeAdhan: true,
        atAdhan: true,
        atIqamah: true,
        morningAdhkar: true,
        eveningAdhkar: true,
      },
      alarmOnSilent: false,
      isLoading: false,
      error: new Error('channels unavailable'),
      sync: jest.fn(async () => undefined),
      setNotificationEnabled: jest.fn(async () => undefined),
      setNotificationMoment: jest.fn(async () => undefined),
      setAlarmOnSilent: jest.fn(async () => undefined),
      setCountdownEnabled: jest.fn(async () => undefined),
      cancel: jest.fn(async () => undefined),
    })

    render(<SettingsRoute />)

    await waitFor(() =>
      expect(screen.getByTestId('theme-dark').props.accessibilityState.selected).toBe(true),
    )
    expect(screen.getByTestId('settings-schedule-error')).toHaveTextContent(
      deviceCopy.errors.scheduleRejected,
    )
  })
})
