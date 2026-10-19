import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react-native'

import { WIRD_LEVELS } from '@nabd/shared'

import type { PersistedOnboarding } from '../../onboarding/db'
import { useWirdLevel } from '../../wird/useWirdLevel'
import { HomeScreen } from '../HomeScreen'

jest.mock('../../onboarding/OnboardingGate', () => ({
  ScreenContainer: ({ children, testID }: { children: ReactNode; testID: string }) => {
    const { View: MockView } = require('react-native')
    return <MockView testID={testID}>{children}</MockView>
  },
}))
jest.mock('../../wird/CompletionCelebration', () => ({ CompletionCelebration: () => null }))
jest.mock('../../wird/TodaySummary', () => ({ TodaySummary: () => null }))
jest.mock('../../wird/WirdChecklist', () => ({ WirdChecklist: () => null }))
jest.mock('../../wird/WirdDayProvider', () => ({
  WirdDayProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
jest.mock('../../wird/useWirdLevel', () => ({ useWirdLevel: jest.fn() }))

const mockedUseWirdLevel = useWirdLevel as jest.MockedFunction<typeof useWirdLevel>

describe('HomeScreen', () => {
  it('renders the selected level title and home shell', async () => {
    const persisted: PersistedOnboarding = {
      answers: {},
      selectedLevelId: WIRD_LEVELS[0].id,
      completedAt: 0,
      effectiveFrom: '2026-09-14',
      activeWird: {
        id: 'version',
        effectiveFrom: '2026-09-14',
        definition: WIRD_LEVELS[0].wird,
        createdAt: 0,
      },
    }

    mockedUseWirdLevel.mockReturnValue({
      currentLevelId: WIRD_LEVELS[0].id,
      canChangeLevel: true,
      changeLevel: jest.fn(),
      isLoading: false,
    })

    await render(<HomeScreen persisted={persisted} />)

    expect(screen.getByTestId('home-shell')).toBeTruthy()
    expect(screen.getByText(WIRD_LEVELS[0].title)).toBeTruthy()
  })

  it('updates the header when the live wird level changes while mounted', async () => {
    const persisted: PersistedOnboarding = {
      answers: {},
      selectedLevelId: WIRD_LEVELS[0].id,
      completedAt: 0,
      effectiveFrom: '2026-09-14',
      activeWird: {
        id: 'version',
        effectiveFrom: '2026-09-14',
        definition: WIRD_LEVELS[0].wird,
        createdAt: 0,
      },
    }
    let currentLevelId = WIRD_LEVELS[0].id
    mockedUseWirdLevel.mockImplementation(() => ({
      currentLevelId,
      canChangeLevel: true,
      changeLevel: jest.fn(),
      isLoading: false,
    }))

    const { rerender } = await render(<HomeScreen persisted={persisted} />)
    expect(screen.getByText(WIRD_LEVELS[0].title)).toBeTruthy()

    currentLevelId = WIRD_LEVELS[1].id
    await rerender(<HomeScreen persisted={persisted} />)

    expect(screen.getByText(WIRD_LEVELS[1].title)).toBeTruthy()
    expect(screen.queryByText(WIRD_LEVELS[0].title)).toBeNull()
  })
})
