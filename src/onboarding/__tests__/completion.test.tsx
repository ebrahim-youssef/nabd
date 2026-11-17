import { act, render, screen, waitFor } from '@testing-library/react-native'
import { useSQLiteContext } from 'expo-sqlite'

import TabsLayout from '../../../app/(tabs)/_layout'
import { setOnboardingComplete } from '../completion'
import { createOnboardingRepository } from '../db'

jest.mock('expo-router', () => {
  const React = require('react') as typeof import('react')

  return {
    Tabs: ({ tabBar }: { tabBar: () => React.ReactNode }) => tabBar(),
  }
})
jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ setColorScheme: jest.fn() }),
}))
jest.mock('../../preferences/db', () => ({
  PREFERENCE_KEYS: { theme: 'nabd:theme' },
  createPreferencesRepository: () => ({ read: jest.fn().mockResolvedValue(null) }),
}))
jest.mock('../../preferences/theme', () => ({ readStoredTheme: () => 'light' }))
jest.mock('../../shell/BottomNav', () => {
  const React = require('react') as typeof import('react')
  const { View } = require('react-native') as typeof import('react-native')

  return {
    BottomNav: ({ isVisible }: { isVisible: boolean }) =>
      isVisible ? React.createElement(View, { testID: 'bottom-nav' }) : null,
  }
})
jest.mock('../db', () => ({ createOnboardingRepository: jest.fn() }))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedCreateOnboardingRepository = createOnboardingRepository as jest.MockedFunction<
  typeof createOnboardingRepository
>

describe('onboarding completion bootstrap', () => {
  let resolveLoad: (value: unknown) => void
  const loadOnboarding = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    setOnboardingComplete(false)
    mockedUseSQLiteContext.mockReturnValue({} as ReturnType<typeof useSQLiteContext>)
    loadOnboarding.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve
        }),
    )
    mockedCreateOnboardingRepository.mockReturnValue({ load: loadOnboarding } as never)
  })

  it('shows bottom navigation after a deep-linked layout loads completed onboarding', async () => {
    await render(<TabsLayout />)
    await waitFor(() => expect(loadOnboarding).toHaveBeenCalledTimes(1))

    expect(screen.queryByTestId('bottom-nav')).toBeNull()

    await act(async () => resolveLoad({ selectedLevelId: 'light' }))

    await waitFor(() => expect(screen.getByTestId('bottom-nav')).toBeTruthy())
  })

  it('keeps the gate value when the initial repository load resolves late', async () => {
    await render(<TabsLayout />)
    await waitFor(() => expect(loadOnboarding).toHaveBeenCalledTimes(1))

    setOnboardingComplete(false)
    await act(async () => resolveLoad({ selectedLevelId: 'light' }))

    expect(screen.queryByTestId('bottom-nav')).toBeNull()
  })
})
