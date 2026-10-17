import { WIRD_LEVELS, type DayId, type WirdDefinition } from '@nabd/shared'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { Pressable, Text, View } from 'react-native'

import type { ProductDatabase, SqlValue } from '../../db/productDatabase'
import { logger } from '../../observability/logger'
import { useToggleItem } from '../useToggleItem'
import { useWirdChecklist } from '../useWirdChecklist'

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }))
jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const DAY = '2026-09-14'
const VERSION_ID = 'version-1'
const CREATED_AT = 100
const ITEM_ID = WIRD_LEVELS[0].wird.items[0].id
const CHANGED_DEFINITION: WirdDefinition = {
  ...WIRD_LEVELS[0].wird,
  items: WIRD_LEVELS[0].wird.items.map((item, index) =>
    index === 0 ? { ...item, label: `${item.label} changed` } : item,
  ),
}

type EntryRow = {
  id: string
  day: string
  version_id: string
  item_id: string
  done: number
  at: number
}

function createDatabase(
  options: {
    failHealing?: boolean
    failInsert?: boolean
    initialEntries?: EntryRow[]
    insertGate?: Promise<void>
    versionDefinition?: WirdDefinition
  } = {},
) {
  const entries: EntryRow[] = [...(options.initialEntries ?? [])]
  const versions = [
    {
      id: VERSION_ID,
      effective_from: DAY,
      definition_json: JSON.stringify(options.versionDefinition ?? WIRD_LEVELS[0].wird),
      created_at: CREATED_AT,
    },
  ]
  let nextId = entries.length + 1
  let insertGate = options.insertGate
  let healCalls = 0
  let listVersionsCalls = 0
  const healedDays: string[] = []
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
      if (source.includes('ORDER BY effective_from, created_at')) listVersionsCalls += 1
      if (source.includes('wird_versions')) {
        return versions as T[]
      }
      if (source.includes('LIKE')) {
        return entries.filter((entry) =>
          entry.day.startsWith(String(parameters[0]).replace('%', '')),
        ) as T[]
      }
      return entries.filter((entry) => entry.day === String(parameters[0])) as T[]
    },
    runAsync: async (source, ...parameters) => {
      if (source.includes('INSERT INTO wird_versions')) {
        healedDays.push(String(parameters[0]))
        versions.push({
          id: `version-${versions.length + 1}`,
          effective_from: String(parameters[0]),
          definition_json: String(parameters[1]),
          created_at: Number(parameters[2]),
        })
      }
    },
    withExclusiveTransactionAsync: async (task) => {
      healCalls += 1
      if (options.failHealing) throw new Error('healing failed')
      return task(database)
    },
  }
  return {
    database,
    entries,
    getHealCalls: () => healCalls,
    getHealedDays: () => healedDays,
    getListVersionsCalls: () => listVersionsCalls,
    holdInsert: (gate: Promise<void>) => (insertGate = gate),
  }
}

function Harness({ day = DAY }: { day?: DayId }) {
  const { areas, isLoading, versionId, refresh } = useWirdChecklist(day)
  const { toggle, pendingItemIds, hasError } = useToggleItem(versionId, refresh)
  if (isLoading) return <Text testID="loading">loading</Text>
  const item = areas[0]?.items[0]
  if (!item) return <Text testID="empty">empty</Text>
  return (
    <View>
      <Text testID="item-label">{item.label}</Text>
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
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('settles after a healing read creates a version without repeating list reads', async () => {
    const { database, getListVersionsCalls } = createDatabase({
      versionDefinition: CHANGED_DEFINITION,
    })
    mockedUseSQLiteContext.mockReturnValue(database as never)

    await render(<Harness />)

    expect(await screen.findByTestId('item-label')).toBeTruthy()
    await waitFor(() => expect(getListVersionsCalls()).toBeGreaterThan(0))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(getListVersionsCalls()).toBe(1)
  })

  it("heals tomorrow's version when viewing a past day", async () => {
    const tomorrow = '2026-09-16'
    jest.spyOn(Date.prototype, 'getFullYear').mockReturnValue(2026)
    jest.spyOn(Date.prototype, 'getMonth').mockReturnValue(8)
    jest.spyOn(Date.prototype, 'getDate').mockReturnValue(15)
    const { database, getHealedDays } = createDatabase({
      versionDefinition: CHANGED_DEFINITION,
    })
    mockedUseSQLiteContext.mockReturnValue(database as never)

    await render(<Harness day={DAY} />)

    await screen.findByTestId('item-label')
    expect(getHealedDays()).toEqual([tomorrow])
  })

  it('heals today without changing an old day entry', async () => {
    const oldEntry: EntryRow = {
      id: 'entry-history',
      day: '2026-09-13',
      version_id: VERSION_ID,
      item_id: ITEM_ID,
      done: 1,
      at: CREATED_AT,
    }
    const { database, entries } = createDatabase({
      initialEntries: [oldEntry],
      versionDefinition: CHANGED_DEFINITION,
    })
    mockedUseSQLiteContext.mockReturnValue(database as never)

    await render(<Harness />)

    expect(await screen.findByTestId('item-label')).toHaveTextContent(
      CHANGED_DEFINITION.items[0].label,
    )
    expect(entries).toContainEqual(oldEntry)
  })

  it('heals once per current day even when the viewed day changes', async () => {
    const { database, getHealCalls } = createDatabase()
    mockedUseSQLiteContext.mockReturnValue(database as never)
    const view = await render(<Harness />)

    await screen.findByTestId('item')
    expect(getHealCalls()).toBe(1)

    await view.rerender(<Harness />)
    await screen.findByTestId('item')
    expect(getHealCalls()).toBe(1)

    await view.rerender(<Harness day="2026-09-15" />)
    await waitFor(() => expect(getHealCalls()).toBe(1))
  })

  it('logs a healing failure and still renders the old definition', async () => {
    const errorSpy = jest.spyOn(logger, 'error').mockImplementation(() => undefined)
    const { database } = createDatabase({
      failHealing: true,
      versionDefinition: CHANGED_DEFINITION,
    })
    mockedUseSQLiteContext.mockReturnValue(database as never)

    await render(<Harness />)

    expect(await screen.findByTestId('item-label')).toHaveTextContent(
      CHANGED_DEFINITION.items[0].label,
    )
    expect(errorSpy).toHaveBeenCalledWith('Native wird version healing failed', expect.any(Error), {
      day: DAY,
    })
  })

  it('writes a toggle and re-reads the checklist state', async () => {
    const { database, entries } = createDatabase()
    mockedUseSQLiteContext.mockReturnValue(database as never)
    await render(<Harness />)

    const item = await screen.findByTestId('item')
    await fireEvent.press(item)

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
    await render(<Harness />)

    const item = await screen.findByTestId('item')
    await fireEvent.press(item)
    await fireEvent.press(item)
    expect(item.props.accessibilityState.disabled).toBe(true)
    expect(entries).toHaveLength(0)

    release()
    await waitFor(() => expect(screen.getByText('done')).toBeTruthy())
    expect(entries).toHaveLength(1)
  })

  it('surfaces a failed toggle through hasError', async () => {
    const { database } = createDatabase({ failInsert: true })
    mockedUseSQLiteContext.mockReturnValue(database as never)
    await render(<Harness />)

    await fireEvent.press(await screen.findByTestId('item'))

    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByText('not-done')).toBeTruthy()
  })
})
