import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { Pressable, Text } from 'react-native'

import type { ProductDatabase, SqlValue } from '../../db/productDatabase'
import { useDhikrCounter } from '../useDhikrCounter'
import { useWirdDay } from '../../wird/WirdDayProvider'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('../../wird/WirdDayProvider', () => ({ useWirdDay: jest.fn() }))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedUseWirdDay = useWirdDay as jest.MockedFunction<typeof useWirdDay>
const DAY = '2026-09-14'
const VERSION_ID = 'version-1'

type EntryRow = {
  id: string
  day: string
  version_id: string
  item_id: string
  done: number
  at: number
}

function createDatabase(itemId: string, insertGate?: Promise<void>) {
  const entries: EntryRow[] = []
  let nextId = 1
  const database: ProductDatabase = {
    execAsync: async () => undefined,
    getFirstAsync: async <T,>(source: string, ...parameters: SqlValue[]) => {
      if (!source.includes('INSERT INTO wird_entries')) return null
      await insertGate
      const row: EntryRow = {
        id: `entry-${nextId++}`,
        day: String(parameters[0]),
        version_id: String(parameters[1]),
        item_id: String(parameters[2]),
        done: 1,
        at: Number(parameters[3]),
      }
      entries.push(row)
      return row as T
    },
    getAllAsync: async <T,>(source: string) => {
      if (source.includes('wird_versions')) {
        return [
          {
            id: VERSION_ID,
            effective_from: DAY,
            definition_json: JSON.stringify({
              areas: [{ id: 'area', label: 'Area', order: 0 }],
              items: [{ id: itemId, areaId: 'area', label: 'Dhikr', kind: 'counter', target: 3 }],
            }),
            created_at: 1,
          },
        ] as T[]
      }
      return entries.filter((entry) => entry.day === DAY) as T[]
    },
    runAsync: async () => undefined,
    withExclusiveTransactionAsync: async (task) => task(database),
  }
  return { database, entries }
}

function Harness({
  itemId,
  target = 3,
  done = false,
  batchTap = false,
}: {
  itemId: string
  target?: number
  done?: boolean
  batchTap?: boolean
}) {
  const { count, tap } = useDhikrCounter(DAY, itemId, target, done)
  return (
    <Pressable
      onPress={() => {
        if (batchTap) {
          void tap()
          void tap()
          void tap()
        } else void tap()
      }}
      testID="counter"
    >
      <Text testID="count">{count}</Text>
    </Pressable>
  )
}

describe('useDhikrCounter', () => {
  beforeEach(() => {
    mockedUseWirdDay.mockReturnValue({
      isLoading: false,
      areas: [],
      versionId: null,
      refresh: jest.fn(),
      day: DAY,
    })
  })

  it('increments session count without writing below target', async () => {
    const { database, entries } = createDatabase('counter-below-target')
    mockedUseSQLiteContext.mockReturnValue(database as never)
    render(<Harness itemId="counter-below-target" />)

    fireEvent.press(screen.getByTestId('counter'))
    fireEvent.press(screen.getByTestId('counter'))

    expect(screen.getByTestId('count')).toHaveTextContent('2')
    expect(entries).toHaveLength(0)
  })

  it('completes once at target and resets the session count', async () => {
    const { database, entries } = createDatabase('counter-completes')
    mockedUseSQLiteContext.mockReturnValue(database as never)
    const refresh = jest.fn()
    mockedUseWirdDay.mockReturnValue({
      isLoading: false,
      areas: [],
      versionId: null,
      refresh,
      day: DAY,
    })
    render(<Harness itemId="counter-completes" />)

    fireEvent.press(screen.getByTestId('counter'))
    fireEvent.press(screen.getByTestId('counter'))
    fireEvent.press(screen.getByTestId('counter'))

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'))
    expect(entries).toHaveLength(1)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('preserves a partial count across a remount', () => {
    const { database } = createDatabase('counter-remount')
    mockedUseSQLiteContext.mockReturnValue(database as never)
    const view = render(<Harness itemId="counter-remount" />)

    fireEvent.press(screen.getByTestId('counter'))
    expect(screen.getByTestId('count')).toHaveTextContent('1')

    view.unmount()
    render(<Harness itemId="counter-remount" />)

    expect(screen.getByTestId('count')).toHaveTextContent('1')
  })

  it('keeps rapid taps authoritative and prevents a second completion write', async () => {
    const { database, entries } = createDatabase('counter-rapid')
    mockedUseSQLiteContext.mockReturnValue(database as never)
    render(<Harness batchTap itemId="counter-rapid" target={2} />)

    fireEvent.press(screen.getByTestId('counter'))

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'))
    expect(entries).toHaveLength(1)
  })

  it('ignores taps for an already done item', () => {
    const { database, entries } = createDatabase('counter-done')
    mockedUseSQLiteContext.mockReturnValue(database as never)
    render(<Harness itemId="counter-done" done />)

    fireEvent.press(screen.getByTestId('counter'))

    expect(screen.getByTestId('count')).toHaveTextContent('0')
    expect(entries).toHaveLength(0)
  })
})
