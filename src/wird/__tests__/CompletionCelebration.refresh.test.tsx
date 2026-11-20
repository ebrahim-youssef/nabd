import { act, render, screen, waitFor } from '@testing-library/react-native'

import { refreshLiveRepositoryQueries } from '../../shell/useLiveRepositoryQuery'
import { BottomSheet } from '../../ui/BottomSheet'
import { CompletionCelebration } from '../CompletionCelebration'
import { WIRD_COPY } from '../copy'

let mockDone = false
const mockRepository = {
  listVersions: jest.fn(async () => [{ definition: {} }]),
  getDayEntries: jest.fn(async () => []),
  getMonthEntries: jest.fn(async () => []),
  getEntriesInRange: jest.fn(async () => []),
}
const mockPreferences = { read: jest.fn(async () => null), write: jest.fn(async () => {}) }
const mockDatabase = {}

jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDatabase }))
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}))
jest.mock('lucide-react-native', () => ({ Star: () => null }))
jest.mock('../../day-plan/WirdTodayProvider', () => ({ useWirdToday: () => '2026-11-20' }))
jest.mock('../../day-plan/logic', () => ({
  buildDayPlan: () => ({ progress: { done: mockDone ? 1 : 0, required: 1 } }),
}))
jest.mock('../../lib/wird', () => ({ versionInForce: (versions: unknown[]) => versions[0] }))
jest.mock('../../onboarding/db', () => ({
  createOnboardingRepository: () => ({ load: async () => null }),
}))
jest.mock('../../preferences/db', () => ({
  PREFERENCE_KEYS: { celebratedDay: 'nabd:celebrated-day' },
  createPreferencesRepository: () => mockPreferences,
}))
jest.mock('../useWirdRepository', () => ({ useWirdRepository: () => mockRepository }))
jest.mock('../../stats/useStats', () => ({ STATS_WINDOW_DAYS: 30 }))
jest.mock('../../stats/logic', () => ({ currentStreak: () => 1, rangeCompletion: () => [] }))
jest.mock('../../../theme/tokens', () => ({ useThemeColors: () => ({ gold: 'gold' }) }))

it('reads the completed plan after the global repository refresh', async () => {
  mockDone = false
  jest.clearAllMocks()
  const view = render(<CompletionCelebration />)
  await waitFor(() => expect(view.UNSAFE_queryByType(BottomSheet)).not.toBeNull(), {
    timeout: 5000,
  })
  expect(screen.queryByText(WIRD_COPY.celebrationTitle)).toBeNull()
  mockDone = true
  await act(async () => refreshLiveRepositoryQueries())
  await waitFor(() => expect(screen.getByText(WIRD_COPY.celebrationTitle)).toBeTruthy(), {
    timeout: 5000,
  })
  expect(mockPreferences.write).toHaveBeenCalledWith(
    'nabd:celebrated-day',
    '2026-11-20',
    expect.any(Number),
  )
})
