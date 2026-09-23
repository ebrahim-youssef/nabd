import {
  act,
  fireEvent,
  getMockContext,
  renderRouter,
  screen,
  waitFor,
} from 'expo-router/testing-library'
import { ExpoRoot } from 'expo-router/build/ExpoRoot'

import { shellCopy } from '@nabd/shared'

import { NATIVE_SHELL_COPY } from '../shell/constants'

type MockDatabase = {
  execAsync: jest.Mock<Promise<void>, [string]>
  getFirstAsync: jest.Mock<Promise<{ version: number } | null>, [string, ...unknown[]]>
  runAsync: jest.Mock<Promise<unknown>, [string, ...unknown[]]>
  withExclusiveTransactionAsync: jest.Mock<
    Promise<void>,
    [(database: MockDatabase) => Promise<void>]
  >
}

const mockState = {
  database: null as MockDatabase | null,
  onInit: null as ((database: MockDatabase) => Promise<void>) | null,
  onError: null as ((cause: Error) => void) | null,
  setOpened: null as (() => void) | null,
}

jest.mock('expo-sqlite', () => {
  const React = require('react') as typeof import('react')
  const DatabaseContext = React.createContext<MockDatabase | null>(null)

  function SQLiteProvider({
    children,
    onError,
    onInit,
  }: {
    children: React.ReactNode
    onError?: (cause: Error) => void
    onInit?: (database: MockDatabase) => Promise<void>
  }) {
    const [opened, setOpened] = React.useState(false)

    React.useEffect(() => {
      mockState.onInit = onInit ?? null
      mockState.onError = onError ?? null
      mockState.setOpened = () => setOpened(true)
      return () => {
        mockState.onInit = null
        mockState.onError = null
        mockState.setOpened = null
      }
    }, [onError, onInit])

    if (!opened) return null
    return React.createElement(DatabaseContext.Provider, { value: mockState.database }, children)
  }

  return {
    SQLiteProvider,
    useSQLiteContext: () => React.useContext(DatabaseContext),
  }
})

jest.mock('lucide-react-native', () => {
  const React = require('react') as typeof import('react')
  const MockIcon = () => React.createElement('View')
  return {
    BarChart3: MockIcon,
    Clock: MockIcon,
    Home: MockIcon,
    LibraryBig: MockIcon,
    Settings: MockIcon,
  }
})

jest.mock('nativewind', () => ({
  useColorScheme: () => ({ setColorScheme: jest.fn() }),
}))

function createDatabase(shouldFail = false): MockDatabase {
  const database = {} as MockDatabase
  database.execAsync = jest.fn(async (_source: string): Promise<void> => {
    if (shouldFail) throw new Error('migration failed')
  })
  database.getFirstAsync = jest.fn(async (source: string) =>
    source.includes('SELECT version FROM schema_version') ? { version: 4 } : null,
  )
  database.runAsync = jest.fn(
    async (_source: string, ..._parameters: unknown[]): Promise<unknown> => undefined,
  )
  database.withExclusiveTransactionAsync = jest.fn(async (task) => task(database))
  return database
}

function resetDatabaseMock() {
  mockState.database = createDatabase()
  mockState.onInit = null
  mockState.onError = null
  mockState.setOpened = null
}

async function resolveDatabase() {
  if (!mockState.database || !mockState.onInit || !mockState.setOpened) {
    throw new Error('SQLite test provider was not mounted')
  }
  await mockState.onInit(mockState.database)
  mockState.setOpened()
}

beforeEach(() => {
  resetDatabaseMock()
  jest.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  jest.restoreAllMocks()
  jest.useRealTimers()
})

describe('native root layout', () => {
  it('keeps the root navigator visible while tabs wait for SQLite, then renders home', async () => {
    const router = renderRouter('./app')

    expect(router.getRouterState()).toBeDefined()
    expect(screen.getByTestId('database-loading')).toBeTruthy()

    await act(async () => {
      await resolveDatabase()
    })
    await waitFor(() => expect(screen.getByTestId('onboarding-welcome')).toBeTruthy())

    expect(screen.getByTestId('onboarding-welcome')).toBeTruthy()
    const initCalls = mockState.database?.execAsync.mock.calls.length
    router.rerender(<ExpoRoot context={getMockContext('./app')} location="/" />)
    expect(mockState.database?.execAsync.mock.calls.length).toBe(initCalls)
  })

  it('shows the Arabic error screen, then retries migration on a fresh provider', async () => {
    renderRouter('./app')
    mockState.database = createDatabase(true)

    await act(async () => {
      await resolveDatabase()
    })

    await waitFor(() => expect(screen.getByTestId('database-error')).toBeTruthy())
    expect(screen.getByText(NATIVE_SHELL_COPY.databaseError)).toBeTruthy()

    mockState.database = createDatabase()
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: shellCopy.retry }))
    })
    await act(async () => {
      await resolveDatabase()
    })

    await waitFor(() => expect(screen.getByTestId('onboarding-welcome')).toBeTruthy())
  })
})
