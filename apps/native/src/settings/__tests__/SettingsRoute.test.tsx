import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'

import { WIRD_LEVELS } from '@nabd/shared'
import { useSQLiteContext } from 'expo-sqlite'

import { SettingsRoute } from '../SettingsRoute'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../../preferences/db'
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
    theme: 'nabd:theme',
  },
  createPreferencesRepository: jest.fn(),
}))
jest.mock('../../preferences/theme', () => ({
  DEFAULT_NATIVE_THEME: 'system',
  SYSTEM_THEME_LABEL: 'حسب الجهاز',
  readStoredTheme: (value: string | null) =>
    value === 'light' || value === 'dark' || value === 'system' ? value : 'system',
}))
jest.mock('../../wird/useWirdRepository', () => ({ useWirdRepository: jest.fn() }))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedCreatePreferencesRepository = createPreferencesRepository as jest.MockedFunction<
  typeof createPreferencesRepository
>
const mockedUseWirdRepository = useWirdRepository as jest.MockedFunction<typeof useWirdRepository>

const readPreference = jest.fn()
const writePreference = jest.fn()
const setWirdLevel = jest.fn()

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
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders persisted controls and writes changes for appearance, method, and tomorrow level', async () => {
    const { unmount } = render(<SettingsRoute />)

    await waitFor(() => expect(screen.getByTestId('settings-screen')).toBeTruthy())
    await waitFor(() =>
      expect(screen.getByTestId('level-level-1').props.accessibilityState.selected).toBe(true),
    )
    expect(screen.getByTestId('theme-dark').props.accessibilityState.selected).toBe(true)
    expect(screen.getByTestId('theme-system').props.accessibilityState.selected).toBe(false)
    expect(screen.getByTestId('method-umm_al_qura').props.accessibilityState.selected).toBe(true)

    fireEvent.press(screen.getByTestId('theme-light'))
    fireEvent.press(screen.getByTestId('theme-system'))
    fireEvent.press(screen.getByTestId('theme-dark'))
    fireEvent.press(screen.getByTestId('method-egyptian'))
    fireEvent.press(screen.getByTestId('level-level-2'))

    await waitFor(() => {
      expect(writePreference).toHaveBeenCalledWith(
        PREFERENCE_KEYS.theme,
        'light',
        expect.any(Number),
      )
      expect(writePreference).toHaveBeenCalledWith(
        PREFERENCE_KEYS.theme,
        'system',
        expect.any(Number),
      )
      expect(writePreference).toHaveBeenCalledWith(
        PREFERENCE_KEYS.theme,
        'dark',
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
      expect(mockSetColorScheme).toHaveBeenCalledWith('system')
      expect(mockSetColorScheme).toHaveBeenCalledWith('dark')
      expect(readPreference).not.toHaveBeenCalledWith('nabd:mode')
    })
    unmount()
  })
})
