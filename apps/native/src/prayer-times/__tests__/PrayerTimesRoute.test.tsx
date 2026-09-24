import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'

import { computeDayTimes, PRAYER_LABELS } from '@nabd/shared'
import { useSQLiteContext } from 'expo-sqlite'

import PrayerTimesRoute from '../../../app/(tabs)/prayer-times'
import { deviceCopy } from '../../device/copy'
import { useLocationCapability } from '../../device/useLocationCapability'
import type { LocationCapabilityView } from '../../device/useLocationCapability'
import { requestPrayerReschedule } from '../../device/prayerAlarms'
import type { LocationStatus } from '../../device/types'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../../preferences/db'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('lucide-react-native', () => ({ ArrowRight: () => null }))
jest.mock('../../preferences/db', () => ({
  PREFERENCE_KEYS: {
    calculationMethod: 'nabd:prayer-calculation-method',
  },
  createPreferencesRepository: jest.fn(),
}))
jest.mock('../../device/useLocationCapability', () => ({
  useLocationCapability: jest.fn(),
}))
jest.mock('../../device/prayerAlarms', () => ({
  requestPrayerReschedule: jest.fn(),
}))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedCreatePreferencesRepository = createPreferencesRepository as jest.MockedFunction<
  typeof createPreferencesRepository
>
const mockedUseLocationCapability = useLocationCapability as jest.MockedFunction<
  typeof useLocationCapability
>
const readPreference = jest.fn()
const writePreference = jest.fn()

const readyStatus: LocationStatus = {
  state: 'ready',
  message: deviceCopy.location.ready,
  action: null,
}
const retryStatus: LocationStatus = {
  state: 'unavailable',
  message: deviceCopy.location.unavailable,
  action: { type: 'retry-location', label: deviceCopy.actions.retryLocation },
}
const blockedStatus: LocationStatus = {
  state: 'settings-required',
  message: deviceCopy.location.settingsRequired,
  action: { type: 'open-app-settings', label: deviceCopy.actions.openAppSettings },
}
const refreshingStatus: LocationStatus = {
  state: 'offline-cache',
  message: deviceCopy.location.offlineCache,
  action: { type: 'retry-location', label: deviceCopy.actions.retryLocation },
}

function makeLocationView(overrides: Partial<LocationCapabilityView> = {}): LocationCapabilityView {
  return {
    status: readyStatus,
    coordinates: { latitude: 30.0444, longitude: 31.2357 },
    isRefreshing: false,
    refresh: jest.fn(async () => undefined),
    runAction: jest.fn(async () => undefined),
    ...overrides,
  }
}

describe('PrayerTimesRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-09-20T12:00:00.000Z'))
    mockedUseSQLiteContext.mockReturnValue({} as ReturnType<typeof useSQLiteContext>)
    mockedCreatePreferencesRepository.mockReturnValue({
      read: readPreference,
      write: writePreference,
    } as unknown as ReturnType<typeof createPreferencesRepository>)
    mockedUseLocationCapability.mockReturnValue(makeLocationView())
    readPreference.mockResolvedValue('umm_al_qura')
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders calculated prayer rows from cached coordinates and a persisted method', async () => {
    render(<PrayerTimesRoute />)

    await waitFor(() => expect(screen.getByTestId('prayer-times-table')).toBeTruthy())

    expect(screen.getByText(PRAYER_LABELS.fajr)).toBeTruthy()
    expect(screen.getByTestId('prayer-row-fajr')).toBeTruthy()
    expect(screen.getByTestId('prayer-row-tomorrow-fajr')).toBeTruthy()
    expect(screen.getByTestId('prayer-method-umm_al_qura').props.accessibilityState.selected).toBe(
      true,
    )
    expect(screen.getByTestId('prayer-times-location-card')).toBeTruthy()
    expect(screen.queryByTestId('prayer-times-location-message')).toBeNull()
    expect(screen.queryByTestId('prayer-times-location-action')).toBeNull()
  })

  it('shows a deterministic current-next status for the calculated timeline', async () => {
    const day = new Date('2026-09-20T12:00:00.000Z')
    const times = computeDayTimes({ latitude: 30.0444, longitude: 31.2357 }, day, 'umm_al_qura')
    jest.setSystemTime(new Date(times.dhuhr + 5 * 60_000))

    render(<PrayerTimesRoute />)

    await waitFor(() => expect(screen.getByTestId('prayer-status')).toBeTruthy())
    expect(screen.getByTestId('prayer-status')).toHaveTextContent('أذّن الظهر منذ ٥ دقيقة')
    expect(screen.getByTestId('prayer-row-dhuhr').props.accessibilityState.selected).toBe(true)
    expect(screen.getByTestId('prayer-row-asr').props.accessibilityState.selected).toBe(false)
  })

  it('persists a method change and reads it again after remount', async () => {
    const { unmount } = render(<PrayerTimesRoute />)
    await waitFor(() => expect(screen.getByTestId('prayer-times-table')).toBeTruthy())

    fireEvent.press(screen.getByTestId('prayer-method-egyptian'))
    await waitFor(() =>
      expect(writePreference).toHaveBeenCalledWith(
        PREFERENCE_KEYS.calculationMethod,
        'egyptian',
        expect.any(Number),
      ),
    )
    await waitFor(() => expect(requestPrayerReschedule).toHaveBeenCalledTimes(1))

    unmount()
    readPreference.mockResolvedValue('egyptian')
    render(<PrayerTimesRoute />)
    await waitFor(() =>
      expect(screen.getByTestId('prayer-method-egyptian').props.accessibilityState.selected).toBe(
        true,
      ),
    )
  })

  it('falls back safely when preferences are missing or invalid', async () => {
    readPreference.mockResolvedValue(null)
    mockedUseLocationCapability.mockReturnValue(
      makeLocationView({ coordinates: null, status: retryStatus }),
    )
    const { unmount } = render(<PrayerTimesRoute />)

    await waitFor(() =>
      expect(screen.getByTestId('prayer-method-egyptian').props.accessibilityState.selected).toBe(
        true,
      ),
    )
    expect(screen.getByTestId('prayer-times-location-card')).toBeTruthy()
    expect(screen.getByTestId('prayer-times-location-message')).toHaveTextContent(
      deviceCopy.location.unavailable,
    )
    expect(screen.getByTestId('prayer-times-location-action')).toHaveTextContent(
      deviceCopy.actions.retryLocation,
    )
    expect(screen.queryByTestId('prayer-times-table')).toBeNull()

    unmount()
    readPreference.mockResolvedValue('invalid-method')
    render(<PrayerTimesRoute />)
    await waitFor(() =>
      expect(screen.getByTestId('prayer-method-egyptian').props.accessibilityState.selected).toBe(
        true,
      ),
    )
    expect(screen.getByTestId('prayer-times-location-card')).toBeTruthy()
    expect(screen.queryByTestId('prayer-times-table')).toBeNull()
  })

  it('shows the retry action without coordinates and runs it', async () => {
    const runAction = jest.fn(async () => undefined)
    mockedUseLocationCapability.mockReturnValue(
      makeLocationView({
        coordinates: null,
        status: retryStatus,
        runAction,
      }),
    )

    render(<PrayerTimesRoute />)
    await waitFor(() =>
      expect(
        screen.getByTestId('prayer-method-umm_al_qura').props.accessibilityState.selected,
      ).toBe(true),
    )

    expect(screen.getByTestId('prayer-times-location-card')).toBeTruthy()
    expect(screen.getByTestId('prayer-times-location-message')).toHaveTextContent(
      deviceCopy.location.unavailable,
    )
    expect(screen.getByTestId('prayer-times-location-action')).toHaveTextContent(
      deviceCopy.actions.retryLocation,
    )

    expect(runAction).not.toHaveBeenCalled()
    fireEvent.press(screen.getByTestId('prayer-times-location-action'))

    expect(runAction).toHaveBeenCalledTimes(1)
    expect(screen.queryByTestId('prayer-times-table')).toBeNull()
  })

  it('shows the open-settings action for blocked location permission', async () => {
    mockedUseLocationCapability.mockReturnValue(
      makeLocationView({ coordinates: null, status: blockedStatus }),
    )

    render(<PrayerTimesRoute />)
    await waitFor(() =>
      expect(
        screen.getByTestId('prayer-method-umm_al_qura').props.accessibilityState.selected,
      ).toBe(true),
    )

    expect(screen.getByTestId('prayer-times-location-message')).toHaveTextContent(
      deviceCopy.location.settingsRequired,
    )
    expect(screen.getByTestId('prayer-times-location-action')).toHaveTextContent(
      deviceCopy.actions.openAppSettings,
    )
  })

  it('keeps cached prayer rows visible while location refreshes and disables the action', async () => {
    const runAction = jest.fn(async () => undefined)
    mockedUseLocationCapability.mockReturnValue(
      makeLocationView({
        status: refreshingStatus,
        isRefreshing: true,
        runAction,
      }),
    )

    render(<PrayerTimesRoute />)
    await waitFor(() =>
      expect(
        screen.getByTestId('prayer-method-umm_al_qura').props.accessibilityState.selected,
      ).toBe(true),
    )

    expect(screen.getByTestId('prayer-times-table')).toBeTruthy()
    expect(screen.getByTestId('prayer-times-location-refreshing')).toBeTruthy()
    expect(
      screen.getByTestId('prayer-times-location-action').props.accessibilityState.disabled,
    ).toBe(true)

    fireEvent.press(screen.getByTestId('prayer-times-location-action'))

    expect(runAction).not.toHaveBeenCalled()
  })
})
