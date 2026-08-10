import { ONBOARDING_COPY, QUESTIONS, WIRD_LEVELS } from '@nabd/shared'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { useSQLiteContext } from 'expo-sqlite'

import { OnboardingGate } from '../OnboardingGate'
import type { OnboardingDatabase } from '../db'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('../../observability/sentry', () => ({ captureException: jest.fn() }))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const FIXED_DATE = new Date(2026, 7, 10, 0, 30)
const NOW = () => FIXED_DATE

type StateRow = {
  answers_json: string
  selected_level_id: string
  completed_at: number
  effective_from: string
  wird_version_id: string
}
type VersionRow = {
  id: string
  level_id: string
  effective_from: string
  definition_json: string
  created_at: number
}

function createPersistedDatabase() {
  let state: StateRow | null = null
  const versions = new Map<string, VersionRow>()
  const database: OnboardingDatabase = {
    getFirstAsync: async <T,>(source: string, ...parameters: (string | number | null)[]) => {
      if (source.includes('onboarding_state')) return state as T | null
      if (source.includes('LIMIT 1')) return ([...versions.values()][0] ?? null) as T | null
      return (versions.get(String(parameters[0])) ?? null) as T | null
    },
    runAsync: jest.fn(
      async (source: string, ...parameters: (string | number | null)[]): Promise<unknown> => {
        if (source.includes('INSERT INTO wird_versions')) {
          versions.set(String(parameters[0]), {
            id: String(parameters[0]),
            level_id: String(parameters[1]),
            effective_from: String(parameters[2]),
            definition_json: String(parameters[3]),
            created_at: Number(parameters[4]),
          })
        }
        if (source.includes('INSERT INTO onboarding_state')) {
          state = {
            answers_json: String(parameters[1]),
            selected_level_id: String(parameters[2]),
            completed_at: Number(parameters[3]),
            effective_from: String(parameters[4]),
            wird_version_id: String(parameters[5]),
          }
        }
        return undefined
      },
    ),
    withExclusiveTransactionAsync: async (task) => task(database),
  }
  return { database, state: () => state }
}

function renderGate(database: OnboardingDatabase) {
  mockedUseSQLiteContext.mockReturnValue(database as never)
  return render(<OnboardingGate now={NOW} />)
}

describe('OnboardingGate', () => {
  it('renders a loading skeleton, retryable error, and complete welcome content', async () => {
    let resolveLoad: (() => void) | undefined
    const loadingDatabase: OnboardingDatabase = {
      getFirstAsync: <T,>() => {
        if (resolveLoad) return Promise.resolve(null)
        return new Promise<T | null>((resolve) => {
          resolveLoad = () => resolve(null)
        })
      },
      runAsync: jest.fn(),
      withExclusiveTransactionAsync: jest.fn(),
    }
    const view = renderGate(loadingDatabase)
    expect(screen.getByTestId('gate-loading')).toBeTruthy()
    await waitFor(() => expect(resolveLoad).toBeDefined())
    resolveLoad?.()
    await screen.findByTestId('onboarding-welcome')
    for (const point of ONBOARDING_COPY.welcomePoints) {
      expect(screen.getByText(point)).toBeTruthy()
    }
    view.unmount()

    const failingDatabase: OnboardingDatabase = {
      ...loadingDatabase,
      getFirstAsync: jest.fn(async () => Promise.reject(new Error('SQLite unavailable'))),
    }
    renderGate(failingDatabase)
    await screen.findByTestId('gate-error')
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeTruthy()
  })

  it('completes the reference questionnaire, permits a manual level, and restores after remount', async () => {
    const persisted = createPersistedDatabase()
    const firstMount = renderGate(persisted.database)
    await screen.findByTestId('onboarding-welcome')
    fireEvent.press(screen.getByTestId('onboarding-begin'))

    expect(screen.getAllByRole('radio')).toHaveLength(
      QUESTIONS.reduce((total, question) => total + question.options.length, 0),
    )
    for (const question of QUESTIONS) {
      fireEvent.press(screen.getByTestId(`answer-${question.id}-${question.options[0].id}`))
    }
    fireEvent.press(screen.getByTestId('onboarding-submit'))

    await screen.findByTestId('onboarding-level')
    fireEvent.press(screen.getByTestId(`level-${WIRD_LEVELS[0].id}`))
    expect(screen.getByTestId(`level-${WIRD_LEVELS[0].id}`).props.accessibilityState.checked).toBe(
      true,
    )
    fireEvent.press(screen.getByTestId('onboarding-confirm'))
    fireEvent.press(screen.getByTestId('onboarding-confirm'))

    await screen.findByTestId('home-shell')
    expect(screen.getByText(WIRD_LEVELS[0].title)).toBeTruthy()
    expect(persisted.database.runAsync).toHaveBeenCalledTimes(2)
    expect(persisted.state()?.effective_from).toBe('2026-08-10')

    firstMount.unmount()
    renderGate(persisted.database)
    await waitFor(() => expect(screen.getByTestId('home-shell')).toBeTruthy())
    expect(screen.getByText(WIRD_LEVELS[0].title)).toBeTruthy()
  })
})
