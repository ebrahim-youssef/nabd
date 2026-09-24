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

const mockSQLiteState = {
  shouldFail: false,
  openCalls: 0,
}

jest.mock('expo', () => {
  const actual = jest.requireActual('expo')

  class NativeStatement {
    source = ''

    async runAsync() {
      return {
        changes: 0,
        firstRowValues: this.source.includes('SELECT version FROM schema_version') ? [4] : [],
        lastInsertRowId: 0,
      }
    }

    async getColumnNamesAsync() {
      return this.source.includes('SELECT version FROM schema_version') ? ['version'] : []
    }

    async stepAsync() {
      return null
    }

    async finalizeAsync() {}
  }

  class NativeDatabase {
    constructor() {
      mockSQLiteState.openCalls += 1
    }

    async initAsync() {}

    async closeAsync() {}

    async execAsync() {
      if (mockSQLiteState.shouldFail) throw new Error('migration failed')
    }

    async prepareAsync(statement: NativeStatement, source: string) {
      statement.source = source
    }
  }

  return {
    ...actual,
    requireNativeModule: (name: string) =>
      name === 'ExpoSQLite'
        ? {
            NativeDatabase,
            NativeStatement,
            defaultDatabaseDirectory: 'SQLite',
            ensureDatabasePathExistsAsync: async () => undefined,
          }
        : actual.requireNativeModule(name),
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

function resetDatabaseMock() {
  mockSQLiteState.shouldFail = false
  mockSQLiteState.openCalls = 0
}

async function resolveDatabase() {
  await waitFor(() => expect(mockSQLiteState.openCalls).toBeGreaterThan(0))
}

beforeEach(() => {
  Object.assign(globalThis, { __DEV__: false })
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
    const initCalls = mockSQLiteState.openCalls
    router.rerender(<ExpoRoot context={getMockContext('./app')} location="/" />)
    expect(mockSQLiteState.openCalls).toBe(initCalls)
  })

  it('shows the Arabic error screen, then retries migration on a fresh provider', async () => {
    mockSQLiteState.shouldFail = true
    renderRouter('./app')

    await act(async () => {
      await resolveDatabase()
    })

    await waitFor(() => expect(screen.getByTestId('database-error')).toBeTruthy())
    expect(screen.getByText(NATIVE_SHELL_COPY.databaseError)).toBeTruthy()

    mockSQLiteState.shouldFail = false
    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: shellCopy.retry }))
    })
    await act(async () => {
      await resolveDatabase()
    })

    await waitFor(() => expect(screen.getByTestId('onboarding-welcome')).toBeTruthy())
  })
})
