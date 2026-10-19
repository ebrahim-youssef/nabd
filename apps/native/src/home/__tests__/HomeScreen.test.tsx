import type { ReactNode } from 'react'
import { act, render, screen } from '@testing-library/react-native'

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
  WirdDayProvider: ({ children, day }: { children: ReactNode; day: string }) => {
    const { Text: MockText } = require('react-native')
    return (
      <>
        <MockText testID="provider-day">{day}</MockText>
        {children}
      </>
    )
  },
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

  it('keeps the onboarding level when the live read has no version', async () => {
    mockedUseWirdLevel.mockReturnValue({
      currentLevelId: WIRD_LEVELS[0].id,
      canChangeLevel: false,
      changeLevel: jest.fn(),
      isLoading: false,
    })

    await render(<HomeScreen persisted={persistedAt(WIRD_LEVELS[1].id)} />)

    expect(screen.getByText(WIRD_LEVELS[1].title)).toBeTruthy()
  })

  it('moves the checklist to the next day after midnight while open', async () => {
    jest.useFakeTimers({ now: new Date(2026, 9, 19, 23, 59, 30) })
    try {
      mockedUseWirdLevel.mockReturnValue({
        currentLevelId: WIRD_LEVELS[0].id,
        canChangeLevel: true,
        changeLevel: jest.fn(),
        isLoading: false,
      })

      await render(<HomeScreen persisted={persistedAt(WIRD_LEVELS[0].id)} />)
      expect(screen.getByTestId('provider-day')).toHaveTextContent('2026-10-19')

      await act(async () => {
        jest.advanceTimersByTime(60_000)
      })

      expect(screen.getByTestId('provider-day')).toHaveTextContent('2026-10-20')
    } finally {
      jest.useRealTimers()
    }
  })
})

function persistedAt(selectedLevelId: PersistedOnboarding['selectedLevelId']): PersistedOnboarding {
  return {
    answers: {},
    selectedLevelId,
    completedAt: 0,
    effectiveFrom: '2026-09-14',
    activeWird: {
      id: 'version',
      effectiveFrom: '2026-09-14',
      definition: WIRD_LEVELS[0].wird,
      createdAt: 0,
    },
  }
}
