import { WIRD_LEVELS } from '@nabd/shared'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { Pressable, Text, View } from 'react-native'

import type { ProductDatabase, SqlValue } from '../../db/productDatabase'
import { useToggleItem } from '../useToggleItem'
import { useWirdChecklist } from '../useWirdChecklist'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const DAY = '2026-09-14'
const VERSION_ID = 'version-1'
const CREATED_AT = 100
const ITEM_ID = WIRD_LEVELS[0].wird.items[0].id

type EntryRow = {
  id: string
  day: string
  version_id: string
  item_id: string
  done: number
  at: number
}

function createDatabase(options: { failInsert?: boolean; insertGate?: Promise<void> } = {}) {
  const entries: EntryRow[] = []
  let nextId = 1
  let insertGate = options.insertGate
  const database: ProductDatabase = {
    execAsync: async () => undefined,
    getFirstAsync: async <T,>(source: string, ...parameters: SqlValue[]) => {
      if (!source.includes('INSERT INTO wird_entries')) return null
      if (options.failInsert) throw new Error('insert failed')
      await insertGate
      const row: EntryRow = {
        id: `entry-${nextId++}`,
        day: String(parameters[0]),
        version_id: VERSION_ID,
        item_id: String(parameters[2]),
        done: Number(parameters[3]),
        at: Number(parameters[4]),
      }
      entries.push(row)
      return row as T
    },
    getAllAsync: async <T,>(source: string, ...parameters: SqlValue[]) => {
      if (source.includes('wird_versions')) {
        return [
          {
            id: VERSION_ID,
            effective_from: DAY,
            definition_json: JSON.stringify(WIRD_LEVELS[0].wird),
            created_at: CREATED_AT,
          },
        ] as T[]
      }
      if (source.includes('LIKE')) {
        return entries.filter((entry) =>
          entry.day.startsWith(String(parameters[0]).replace('%', '')),
        ) as T[]
      }
      return entries.filter((entry) => entry.day === String(parameters[0])) as T[]
    },
    runAsync: async () => undefined,
    withExclusiveTransactionAsync: async (task) => task(database),
  }
  return { database, entries, holdInsert: (gate: Promise<void>) => (insertGate = gate) }
}

function Harness() {
  const { areas, isLoading, versionId, refresh } = useWirdChecklist(DAY)
  const { toggle, pendingItemIds, hasError } = useToggleItem(versionId, refresh)
  if (isLoading) return <Text testID="loading">loading</Text>
  const item = areas[0]?.items[0]
  if (!item) return <Text testID="empty">empty</Text>
  return (
    <View>
      <Pressable
        accessibilityState={{ checked: item.done, disabled: pendingItemIds.has(item.id) }}
        disabled={pendingItemIds.has(item.id)}
        onPress={() => void toggle(DAY, item.id, !item.done)}
        testID="item"
      >
        <Text>{item.done ? 'done' : 'not-done'}</Text>
      </Pressable>
      {hasError && <Text testID="error">error</Text>}
    </View>
  )
}

describe('native wird hooks', () => {
  it('writes a toggle and re-reads the checklist state', async () => {
    const { database, entries } = createDatabase()
    mockedUseSQLiteContext.mockReturnValue(database as never)
    render(<Harness />)

    const item = await screen.findByTestId('item')
    fireEvent.press(item)

    await waitFor(() => expect(screen.getByText('done')).toBeTruthy())
    expect(entries).toHaveLength(1)
  })

  it('ignores a second tap while the first write is pending', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const { database, entries } = createDatabase({ insertGate: gate })
    mockedUseSQLiteContext.mockReturnValue(database as never)
    render(<Harness />)

    const item = await screen.findByTestId('item')
    fireEvent.press(item)
    fireEvent.press(item)
    expect(item.props.accessibilityState.disabled).toBe(true)
    expect(entries).toHaveLength(0)

    release()
    await waitFor(() => expect(screen.getByText('done')).toBeTruthy())
    expect(entries).toHaveLength(1)
  })

  it('surfaces a failed toggle through hasError', async () => {
    const { database } = createDatabase({ failInsert: true })
    mockedUseSQLiteContext.mockReturnValue(database as never)
    render(<Harness />)

    fireEvent.press(await screen.findByTestId('item'))

    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })
})
