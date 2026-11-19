import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { useSQLiteContext } from 'expo-sqlite'

import { WIRD_LEVELS } from '../../content/levels'
import type { ProductDatabase, SqlValue } from '../../db/productDatabase'
import { PREFERENCE_KEYS } from '../../preferences/db'
import type { PersistedOnboarding } from '../../onboarding/db'
import { refreshLiveRepositoryQueries } from '../../shell/useLiveRepositoryQuery'
import { HomeScreen } from '../HomeScreen'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('expo-router', () => ({
  useFocusEffect: jest.fn(),
  useRouter: () => ({ push: mockPush }),
}))
jest.mock('../../day-plan/WirdTodayProvider', () => ({ useWirdToday: () => '2026-09-14' }))
jest.mock('../../device/useLocationCapability', () => ({
  useLocationCapability: () => ({ coordinates: null, runAction: jest.fn() }),
}))
jest.mock('nativewind', () => ({ useColorScheme: () => ({ colorScheme: 'light' }) }))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockPush = jest.fn()
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

function createDatabase(
  failHealing = false,
  failVersionReadNumber = 0,
  initialSeenId: string | null = null,
) {
  const entries: EntryRow[] = []
  const actionIds = new Set<string>()
  const staleActions: { actionId: string; day: string; at: number }[] = []
  let staleActionReadCount = 0
  const preferences = new Map<string, string>()
  if (initialSeenId !== null) {
    preferences.set(PREFERENCE_KEYS.prayerActionReviewSeenId, initialSeenId)
  }
  let versionReadCount = 0
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
      if (source.includes('app_preferences')) {
        return (
          preferences.has(String(parameters[0]))
            ? { value: preferences.get(String(parameters[0])) }
            : null
        ) as T | null
      }
      if (source.includes("outcome = 'stale'")) {
        staleActionReadCount += 1
        const action = staleActions[staleActions.length - 1]
        return (action ?? null) as T | null
      }
      if (source.includes('SELECT action_id FROM wird_actions')) {
        return actionIds.has(String(parameters[0])) ? ({ action_id: parameters[0] } as T) : null
      }
      if (source.includes('SELECT done, at FROM wird_entries')) {
        const matchingEntries = entries.filter(
          (candidate) =>
            candidate.day === String(parameters[0]) && candidate.item_id === String(parameters[1]),
        )
        const entry = matchingEntries[matchingEntries.length - 1]
        return entry ? ({ done: entry.done, at: entry.at } as T) : null
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
      if (source.includes('wird_versions')) {
        versionReadCount += 1
        if (versionReadCount === failVersionReadNumber) {
          throw new Error('version read failed once')
        }
        return versions as T[]
      }
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
      if (source.includes('INSERT INTO app_preferences')) {
        preferences.set(String(parameters[0]), String(parameters[1]))
      }
    },
    withExclusiveTransactionAsync: async (task) => {
      if (failHealing) throw new Error('database locked during version healing')
      return task(database)
    },
  }

  return {
    database,
    entries,
    preferences,
    addStaleAction: (actionId: string, day: string, at: number) =>
      staleActions.push({ actionId, day, at }),
    getStaleActionReadCount: () => staleActionReadCount,
    getVersionReadCount: () => versionReadCount,
  }
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
  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  it('hides the review line when the newest stale action is already seen', async () => {
    const { database, addStaleAction, getStaleActionReadCount } = createDatabase(
      false,
      0,
      'stale-seen',
    )
    addStaleAction('stale-seen', '2026-09-13', 300)
    mockedUseSQLiteContext.mockReturnValue(database as never)
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW)

    render(<HomeScreen persisted={persisted()} />)

    expect(await screen.findByRole('button', { name: /أعمال اليوم/ })).toBeTruthy()
    await waitFor(() => expect(getStaleActionReadCount()).toBeGreaterThan(0))
    expect(screen.queryByTestId('prayer-action-review')).toBeNull()
  })

  it.each([
    ['missing', null],
    ['invalid', '   '],
  ] as const)('shows the review line when the seen action id is %s', async (_label, seenId) => {
    const { database, addStaleAction } = createDatabase(false, 0, seenId)
    addStaleAction('stale-action', '2026-09-13', 1)
    mockedUseSQLiteContext.mockReturnValue(database as never)
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW)

    render(<HomeScreen persisted={persisted()} />)

    expect(await screen.findByTestId('prayer-action-review')).toBeTruthy()
  })

  it('marks the newest stale action as seen and navigates to its day', async () => {
    const { database, addStaleAction, preferences, getVersionReadCount } = createDatabase(
      false,
      0,
      'older-action',
    )
    addStaleAction('stale-older', '2026-09-13', 200)
    addStaleAction('stale-newest', '2026-09-12', 300)
    mockPush.mockImplementation(() =>
      expect(preferences.get(PREFERENCE_KEYS.prayerActionReviewSeenId)).toBe('stale-newest'),
    )
    mockedUseSQLiteContext.mockReturnValue(database as never)
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW)

    render(<HomeScreen persisted={persisted()} />)

    fireEvent.press(await screen.findByTestId('prayer-action-review'))
    const versionReadsBeforeOpening = getVersionReadCount()

    await waitFor(() =>
      expect(preferences.get(PREFERENCE_KEYS.prayerActionReviewSeenId)).toBe('stale-newest'),
    )
    expect(getVersionReadCount()).toBe(versionReadsBeforeOpening)
    expect(mockPush).toHaveBeenCalledWith('/today/2026-09-12')
  })

  it('shows a later stale action even when its wall-clock time is earlier', async () => {
    const { database, addStaleAction, getStaleActionReadCount } = createDatabase(
      false,
      0,
      'stale-seen',
    )
    addStaleAction('stale-seen', '2026-09-13', 200)
    mockedUseSQLiteContext.mockReturnValue(database as never)
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW)

    render(<HomeScreen persisted={persisted()} />)

    expect(await screen.findByRole('button', { name: /أعمال اليوم/ })).toBeTruthy()
    await waitFor(() => expect(getStaleActionReadCount()).toBeGreaterThan(0))
    expect(screen.queryByTestId('prayer-action-review')).toBeNull()

    addStaleAction('stale-later', '2026-09-12', 100)
    act(() => refreshLiveRepositoryQueries())

    expect(await screen.findByTestId('prayer-action-review')).toHaveTextContent(
      'تسجيل من الإشعار يحتاج مراجعة',
    )
  })

  it('continues rendering saved items when version healing fails', async () => {
    const { database, getVersionReadCount } = createDatabase(true)
    mockedUseSQLiteContext.mockReturnValue(database as never)
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW)
    const onboarding = persisted()
    onboarding.activeWird.definition = WIRD_LEVELS[1].wird

    render(<HomeScreen persisted={onboarding} />)

    await waitFor(() => expect(getVersionReadCount()).toBeGreaterThan(0))
    fireEvent.press(await screen.findByRole('button', { name: /أعمال اليوم/ }))
    expect(await screen.findByText('قراءة صفحتين من القرآن')).toBeTruthy()
    expect(screen.queryByText('قراءة حزب من القرآن')).toBeNull()
  })

  it('shows retry after a failed plan read and reloads the saved plan', async () => {
    const { database, getVersionReadCount } = createDatabase(false, 2)
    mockedUseSQLiteContext.mockReturnValue(database as never)
    jest.spyOn(Date, 'now').mockReturnValue(FIXED_NOW)

    render(<HomeScreen persisted={persisted()} />)

    expect(await screen.findByText('تعذّر تحميل اليوم. حاول مرة أخرى.')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: 'إعادة المحاولة' }))

    await waitFor(() => expect(getVersionReadCount()).toBeGreaterThan(2))
    fireEvent.press(await screen.findByRole('button', { name: /أعمال اليوم/ }))
    expect(await screen.findByTestId(`sheet-row-${ITEM_ID}`)).toBeTruthy()
  })

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
