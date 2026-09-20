import { WIRD_COPY, type WirdDefinition } from '@nabd/shared'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { useSQLiteContext } from 'expo-sqlite'

import type { ProductDatabase, SqlValue } from '../../db/productDatabase'
import { CompletionCelebration } from '../CompletionCelebration'
import { TodaySummary } from '../TodaySummary'
import { WirdChecklist } from '../WirdChecklist'
import { WirdDayProvider } from '../WirdDayProvider'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const DAY = '2026-09-14'
const VERSION_ID = 'version-1'
const ITEM_ID = 'item-1'
const ITEM_LABEL = 'الصلاة'

type EntryRow = {
  id: string
  day: string
  version_id: string
  item_id: string
  done: number
  at: number
}

function createDatabase(counter = false) {
  const entries: EntryRow[] = []
  const preferences = new Map<string, string>()
  const definition: WirdDefinition = {
    areas: [{ id: 'area-1', label: 'الورد', order: 0 }],
    items: [
      {
        id: ITEM_ID,
        areaId: 'area-1',
        label: ITEM_LABEL,
        kind: counter ? 'counter' : 'checkbox',
        ...(counter ? { target: 2 } : {}),
      },
    ],
  }
  const database: ProductDatabase = {
    execAsync: async () => undefined,
    getFirstAsync: async <T,>(source: string, ...parameters: SqlValue[]) => {
      if (source.includes('INSERT INTO wird_entries')) {
        const isDhikrCompletion = parameters.length === 4
        const row: EntryRow = {
          id: `entry-${entries.length + 1}`,
          day: String(parameters[0]),
          version_id: isDhikrCompletion ? VERSION_ID : String(parameters[1]),
          item_id: String(parameters[2]),
          done: isDhikrCompletion ? 1 : Number(parameters[3]),
          at: Number(parameters[isDhikrCompletion ? 3 : 4]),
        }
        entries.push(row)
        return row as T
      }
      if (source.includes('app_preferences')) {
        const value = preferences.get(String(parameters[0]))
        return value === undefined ? null : ({ value } as T)
      }
      return null
    },
    getAllAsync: async <T,>(source: string, ...parameters: SqlValue[]) => {
      if (source.includes('wird_versions')) {
        return [
          {
            id: VERSION_ID,
            effective_from: DAY,
            definition_json: JSON.stringify(definition),
            created_at: 100,
          },
        ] as T[]
      }
      if (source.includes('LIKE')) {
        const month = String(parameters[0]).replace('%', '')
        return entries.filter((entry) => entry.day.startsWith(month)) as T[]
      }
      return entries.filter((entry) => entry.day === String(parameters[0])) as T[]
    },
    runAsync: async (source: string, ...parameters: SqlValue[]) => {
      if (source.includes('app_preferences'))
        preferences.set(String(parameters[0]), String(parameters[1]))
    },
    withExclusiveTransactionAsync: async (task) => task(database),
  }
  return { database, entries, preferences }
}

function DailyWirdScreen() {
  return (
    <WirdDayProvider day={DAY}>
      <TodaySummary />
      <WirdChecklist />
      <CompletionCelebration />
    </WirdDayProvider>
  )
}

describe('daily wird composed screen', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('updates the summary and opens completion celebration after checking the last item', async () => {
    const { database } = createDatabase()
    mockedUseSQLiteContext.mockReturnValue(database as never)
    jest.spyOn(Date, 'now').mockReturnValue(1_000)

    render(<DailyWirdScreen />)

    expect(await screen.findByTestId('summary-done')).toHaveTextContent('٠')
    expect(screen.getByTestId('summary-total')).toHaveTextContent('١')
    expect(screen.getByTestId('summary-remaining')).toHaveTextContent('١')
    fireEvent.press(await screen.findByTestId(`wird-item-${ITEM_ID}`))

    await waitFor(() => expect(screen.getByTestId('summary-done')).toHaveTextContent('١'))
    expect(await screen.findByTestId('completion-celebration')).toBeTruthy()
    expect(screen.getByText(WIRD_COPY.celebrationTitle)).toBeTruthy()
  })

  it('marks a linked wird item done after the counter reaches its target', async () => {
    const { database, entries } = createDatabase(true)
    mockedUseSQLiteContext.mockReturnValue(database as never)
    jest.spyOn(Date, 'now').mockReturnValue(1_000)

    render(<DailyWirdScreen />)

    const counter = await screen.findByTestId(`dhikr-${ITEM_ID}`)
    fireEvent.press(counter)
    fireEvent.press(counter)

    await waitFor(() => expect(entries).toHaveLength(1))
    await waitFor(() => expect(screen.getByTestId('summary-done')).toHaveTextContent('١'))
    expect(screen.queryByTestId(`dhikr-count-${ITEM_ID}`)).toBeNull()
    expect(screen.getByText('✓')).toBeTruthy()
  })
})
