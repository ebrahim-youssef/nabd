import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'

import { computeDayTimes, PRAYER_LABELS, PRAYER_TIMES_COPY } from '@nabd/shared'
import { useSQLiteContext } from 'expo-sqlite'

import PrayerTimesRoute from '../../../app/(tabs)/prayer-times'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../../preferences/db'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('lucide-react-native', () => ({ ArrowRight: () => null }))
jest.mock(
  'expo-location',
  () => ({
    requestForegroundPermissionsAsync: jest.fn(),
    getCurrentPositionAsync: jest.fn(),
  }),
  { virtual: true },
)
jest.mock('../../preferences/db', () => ({
  PREFERENCE_KEYS: {
    calculationMethod: 'nabd:prayer-calculation-method',
    latitude: 'nabd:cached-latitude',
    longitude: 'nabd:cached-longitude',
  },
  createPreferencesRepository: jest.fn(),
}))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedCreatePreferencesRepository = createPreferencesRepository as jest.MockedFunction<
  typeof createPreferencesRepository
>
const readPreference = jest.fn()
const writePreference = jest.fn()

describe('PrayerTimesRoute', () => {
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
        [PREFERENCE_KEYS.calculationMethod]: 'umm_al_qura',
        [PREFERENCE_KEYS.latitude]: '30.0444',
        [PREFERENCE_KEYS.longitude]: '31.2357',
      }
      return values[key] ?? null
    })
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

    unmount()
    readPreference.mockImplementation(async (key: string) => {
      if (key === PREFERENCE_KEYS.calculationMethod) return 'egyptian'
      return key === PREFERENCE_KEYS.latitude ? '30.0444' : '31.2357'
    })
    render(<PrayerTimesRoute />)
    await waitFor(() =>
      expect(screen.getByTestId('prayer-method-egyptian').props.accessibilityState.selected).toBe(
        true,
      ),
    )
  })

  it('falls back safely when preferences are missing or invalid', async () => {
    readPreference.mockResolvedValue(null)
    const { unmount } = render(<PrayerTimesRoute />)
    await waitFor(() => expect(screen.getByTestId('prayer-times-no-location')).toBeTruthy())
    expect(screen.getByText(PRAYER_TIMES_COPY.enableLocation)).toBeTruthy()
    expect(screen.getByTestId('prayer-method-egyptian').props.accessibilityState.selected).toBe(
      true,
    )

    unmount()
    readPreference.mockImplementation(async (key: string) => {
      if (key === PREFERENCE_KEYS.calculationMethod) return 'invalid-method'
      return key === PREFERENCE_KEYS.latitude ? 'not-a-number' : '31.2357'
    })
    render(<PrayerTimesRoute />)
    await waitFor(() => expect(screen.getByTestId('prayer-times-no-location')).toBeTruthy())
    expect(screen.getByTestId('prayer-method-egyptian').props.accessibilityState.selected).toBe(
      true,
    )
    expect(screen.queryByTestId('prayer-times-table')).toBeNull()
  })

  it('does not request platform location services', async () => {
    render(<PrayerTimesRoute />)
    await waitFor(() => expect(screen.getByTestId('prayer-times-table')).toBeTruthy())

    const location = jest.requireMock('expo-location') as {
      requestForegroundPermissionsAsync: jest.Mock
    }
    expect(location.requestForegroundPermissionsAsync).not.toHaveBeenCalled()
  })
})
