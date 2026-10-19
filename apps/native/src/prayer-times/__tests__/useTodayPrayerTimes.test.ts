import { act, renderHook, waitFor } from '@testing-library/react-native'
import { useFocusEffect } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'

import { useLocationCapability } from '../../device/useLocationCapability'
import { createPreferencesRepository, PREFERENCE_KEYS } from '../../preferences/db'
import { useTodayPrayerTimes } from '../useTodayPrayerTimes'

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }))
jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('../../device/useLocationCapability', () => ({
  useLocationCapability: jest.fn(),
}))
jest.mock('../../preferences/db', () => ({
  PREFERENCE_KEYS: { calculationMethod: 'nabd:prayer-calculation-method' },
  createPreferencesRepository: jest.fn(),
}))
jest.mock('../../device/prayerAlarms', () => ({ requestPrayerReschedule: jest.fn() }))

const mockedUseFocusEffect = useFocusEffect as jest.MockedFunction<typeof useFocusEffect>
const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedUseLocationCapability = useLocationCapability as jest.MockedFunction<
  typeof useLocationCapability
>
const mockedCreatePreferencesRepository = createPreferencesRepository as jest.MockedFunction<
  typeof createPreferencesRepository
>

const readPreference = jest.fn()
let focusCallback: (() => undefined | (() => void)) | undefined
let resolveInitialRead: ((value: string | null) => void) | undefined
let resolveFocusRead: ((value: string | null) => void) | undefined

describe('useTodayPrayerTimes', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    focusCallback = undefined
    resolveInitialRead = undefined
    resolveFocusRead = undefined
    mockedUseFocusEffect.mockImplementation((callback) => {
      focusCallback = callback as typeof focusCallback
    })
    mockedUseSQLiteContext.mockReturnValue({} as ReturnType<typeof useSQLiteContext>)
    mockedUseLocationCapability.mockReturnValue({
      permission: 'granted',
      status: { state: 'ready', message: '', action: null },
      coordinates: { latitude: 30.0444, longitude: 31.2357 },
      isRefreshing: false,
      refresh: jest.fn(async () => undefined),
      runAction: jest.fn(async () => undefined),
    })
    mockedCreatePreferencesRepository.mockReturnValue({
      read: readPreference,
      write: jest.fn(),
    } as never)
    readPreference
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveInitialRead = resolve
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFocusRead = resolve
          }),
      )
  })

  it('re-reads the calculation method when the mounted screen regains focus', async () => {
    const { result } = await renderHook(() => useTodayPrayerTimes())

    await act(async () => {
      resolveInitialRead?.('umm_al_qura')
      await Promise.resolve()
    })
    await waitFor(() => expect(result.current.methodId).toBe('umm_al_qura'))
    expect(focusCallback).toBeDefined()

    await act(async () => {
      focusCallback?.()
      focusCallback?.()
      resolveFocusRead?.('egyptian')
      await Promise.resolve()
    })

    await waitFor(() => expect(result.current.methodId).toBe('egyptian'))
    expect(readPreference).toHaveBeenCalledTimes(2)
    expect(readPreference).toHaveBeenLastCalledWith(PREFERENCE_KEYS.calculationMethod)
  })
})
