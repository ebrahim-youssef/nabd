import type { ReactNode } from 'react'
import { Stack } from 'expo-router'
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import AdhkarLayout from '../../../app/(tabs)/adhkar/_layout'
import TabsLayout from '../../../app/(tabs)/_layout'
import TodayIndexRoute from '../../../app/(tabs)/today/index'
import TodayLayout from '../../../app/(tabs)/today/_layout'
import { Text } from '../Text'

jest.mock('../../wird/CompletionCelebration', () => ({ CompletionCelebration: () => null }))
jest.mock('../../day-plan/WirdTodayProvider', () => ({
  useWirdToday: () => '2026-11-19',
}))
jest.mock('../../onboarding/completion', () => ({ useOnboardingComplete: () => true }))
jest.mock('../../preferences/db', () => ({
  createPreferencesRepository: () => ({ read: async () => null }),
  PREFERENCE_KEYS: { theme: 'theme' },
}))
jest.mock('../../preferences/theme', () => ({ readStoredTheme: () => 'light' }))
jest.mock('../../observability/logger', () => ({ logger: { error: jest.fn() } }))
jest.mock('../../shell/DatabaseStatus', () => ({ DatabaseError: () => null }))
jest.mock('expo-sqlite', () => ({
  ...jest.requireActual('expo-sqlite'),
  useSQLiteContext: () => ({}),
}))
jest.mock('nativewind', () => ({
  useColorScheme: () => ({ colorScheme: 'light', setColorScheme: jest.fn() }),
}))
jest.mock('lucide-react-native', () => {
  const React = require('react') as typeof import('react')
  const MockIcon = () => React.createElement('View')
  return {
    BookOpen: MockIcon,
    CalendarDays: MockIcon,
    Ellipsis: MockIcon,
    Home: MockIcon,
  }
})

const TODAY = '2026-11-19'

function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />
}

function HomeRoute() {
  return <Text testID="home-route">Home</Text>
}

function TodayRoute() {
  return <Text testID="today-route">Today</Text>
}

function AdhkarRoute() {
  return <Text testID="adhkar-route">Adhkar</Text>
}

function RouterTestWrapper({ children }: { children: ReactNode }) {
  return (
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 360, height: 800 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 },
      }}
    >
      {children}
    </SafeAreaProvider>
  )
}

describe('BottomNav router integration', () => {
  it('navigates from Home directly to Today for the current wird day', async () => {
    const router = renderRouter(
      {
        _layout: RootLayout,
        '(tabs)/_layout': TabsLayout,
        '(tabs)/index': HomeRoute,
        '(tabs)/today/_layout': TodayLayout,
        '(tabs)/today/index': TodayIndexRoute,
        '(tabs)/today/[day]': TodayRoute,
        '(tabs)/adhkar/_layout': AdhkarLayout,
        '(tabs)/adhkar/index': AdhkarRoute,
      },
      { initialUrl: '/', wrapper: RouterTestWrapper },
    )

    fireEvent.press(screen.getByTestId('nav-today'))

    await waitFor(() => expect(router.getPathname()).toBe(`/today/${TODAY}`))
    expect(await screen.findByTestId('today-route')).toBeTruthy()
  })
})
