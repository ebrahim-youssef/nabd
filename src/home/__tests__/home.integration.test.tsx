import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { useSQLiteContext } from 'expo-sqlite'

import { WIRD_LEVELS } from '../../content/levels'
import type { ProductDatabase, SqlValue } from '../../db/productDatabase'
import type { PersistedOnboarding } from '../../onboarding/db'
import { HomeScreen } from '../HomeScreen'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  useRouter: () => ({ push: jest.fn() }),
}))
jest.mock('../../day-plan/WirdTodayProvider', () => ({ useWirdToday: () => '2026-09-14' }))
jest.mock('../../device/useLocationCapability', () => ({
  useLocationCapability: () => ({ coordinates: null, runAction: jest.fn() }),
}))
jest.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: 'light' }) }))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const DAY = '2026-09-14'
const VERSION_ID = 'version-1'
const ITEM_ID = 'istighfar'
const FIXED_NOW = Date.parse('2026-09-14T12:00:00+03:00')

type EntryRow = {
  id: string
  day: string
  version_id: string
  item_id: string
  done: number
  at: number
}

function createDatabase() {
  const entries: EntryRow[] = []
  const actionIds = new Set<string>()
  const versions = [
    {
      id: VERSION_ID,
      effective_from: DAY,
      definition_json: JSON.stringify(WIRD_LEVELS[0].wird),
      created_at: FIXED_NOW,
    },
  ]
  let nextEntryId = 1

  const database: ProductDatabase = {
    execAsync: async () => undefined,
    getFirstAsync: async <T,>(source: string, ...parameters: SqlValue[]) => {
      if (source.includes('app_preferences')) return null
      if (source.includes('SELECT action_id FROM wird_actions')) {
        return actionIds.has(String(parameters[0])) ? ({ action_id: parameters[0] } as T) : null
      }
      if (source.includes('SELECT done FROM wird_entries')) {
        const matchingEntries = entries.filter(
          (candidate) =>
            candidate.day === String(parameters[0]) && candidate.item_id === String(parameters[1]),
        )
        const entry = matchingEntries[matchingEntries.length - 1]
        return entry ? ({ done: entry.done } as T) : null
      }
      if (source.includes('INSERT INTO wird_entries')) {
        const entry: EntryRow = {
          id: `entry-${nextEntryId++}`,
          day: String(parameters[0]),
          version_id: String(parameters[1]),
          item_id: String(parameters[2]),
          done: Number(parameters[3]),
          at: Number(parameters[4]),
        }
        entries.push(entry)
        return entry as T
      }
      return null
    },
    getAllAsync: async <T,>(source: string, ...parameters: SqlValue[]) => {
      if (source.includes('wird_versions')) return versions as T[]
      if (source.includes('wird_entries') && source.includes('LIKE')) {
        const month = String(parameters[0]).replace('%', '')
        return entries.filter((entry) => entry.day.startsWith(month)) as T[]
      }
      if (source.includes('wird_entries') && parameters.length > 0) {
        return entries.filter((entry) => entry.day === String(parameters[0])) as T[]
      }
      return []
    },
    runAsync: async (source: string, ...parameters: SqlValue[]) => {
      if (source.includes('INSERT INTO wird_actions')) actionIds.add(String(parameters[0]))
    },
    withExclusiveTransactionAsync: async (task) => task(database),
  }

  return { database, entries }
}

function persisted(): PersistedOnboarding {
  return {
    answers: {},
    selectedLevelId: WIRD_LEVELS[0].id,
    completedAt: FIXED_NOW,
    effectiveFrom: DAY,
    activeWird: {
      id: VERSION_ID,
      effectiveFrom: DAY,
      definition: WIRD_LEVELS[0].wird,
      createdAt: FIXED_NOW,
    },
  }
}

describe('HomeScreen repository integration', () => {
  afterEach(() => jest.restoreAllMocks())

  it('writes a tick and its undo through the repository', async () => {
    const { database, entries } = createDatabase()
    mockedUseSQLiteContext.mockReturnValue(database as never)
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW)

    render(<HomeScreen persisted={persisted()} />)

    fireEvent.press(await screen.findByRole('button', { name: /أعمال اليوم/ }))
    const row = await screen.findByTestId(`sheet-row-${ITEM_ID}`)
    fireEvent.press(row)

    await waitFor(() => expect(entries).toHaveLength(1))
    expect(entries[0]).toMatchObject({
      day: DAY,
      version_id: VERSION_ID,
      item_id: ITEM_ID,
      done: 1,
    })
    await waitFor(() =>
      expect(screen.getByTestId(`sheet-row-${ITEM_ID}`).props.accessibilityState).toEqual({
        checked: true,
      }),
    )

    fireEvent.press(screen.getByRole('button', { name: 'تراجع' }))

    await waitFor(() => expect(entries).toHaveLength(2))
    expect(entries[1]).toMatchObject({
      day: DAY,
      version_id: VERSION_ID,
      item_id: ITEM_ID,
      done: 0,
    })
    await waitFor(() =>
      expect(screen.getByTestId(`sheet-row-${ITEM_ID}`).props.accessibilityState).toEqual({
        checked: false,
      }),
    )
  })
})
