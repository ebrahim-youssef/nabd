import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'

import type { QadaEvent, WirdEntry, WirdRepository, WirdVersion } from '@nabd/shared'
import { useSQLiteContext } from 'expo-sqlite'

import StatsRoute from '../../../app/(tabs)/stats'
import { createQadaRepository } from '../../qada/db'
import { useWirdRepository } from '../../wird/useWirdRepository'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), canGoBack: () => false, replace: jest.fn() }),
  useFocusEffect: jest.fn(),
}))
jest.mock('lucide-react-native', () => ({ ArrowRight: () => null }))
jest.mock('../../wird/useWirdRepository', () => ({ useWirdRepository: jest.fn() }))
jest.mock('../../qada/db', () => ({ createQadaRepository: jest.fn() }))

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedUseWirdRepository = useWirdRepository as jest.MockedFunction<typeof useWirdRepository>
const mockedCreateQadaRepository = createQadaRepository as jest.MockedFunction<
  typeof createQadaRepository
>

const definition = (includeSecond: boolean) => ({
  areas: [{ id: 'area', label: 'الأساس', order: 0 }],
  items: [
    { id: 'first', areaId: 'area', label: 'الأول', kind: 'checkbox' as const },
    ...(includeSecond
      ? [{ id: 'second', areaId: 'area', label: 'الثاني', kind: 'checkbox' as const }]
      : []),
  ],
})

const versions: WirdVersion[] = [
  { id: 'v1', effectiveFrom: '2026-09-14', definition: definition(false), createdAt: 1 },
  { id: 'v2', effectiveFrom: '2026-09-15', definition: definition(true), createdAt: 2 },
]

const entries: WirdEntry[] = [
  { id: 'e1', day: '2026-09-14', versionId: 'v1', itemId: 'first', done: true, at: 1 },
  { id: 'e2', day: '2026-09-15', versionId: 'v2', itemId: 'first', done: true, at: 2 },
]

const qadaEvents: QadaEvent[] = [{ id: 'q1', prayerId: 'fajr', delta: 2, at: 3 }]

function repository(): WirdRepository {
  return {
    listVersions: jest.fn(async () => versions),
    getDayEntries: jest.fn(),
    getMonthEntries: jest.fn(),
    getEntriesInRange: jest.fn(async () => entries),
    getAllEntries: jest.fn(async () => entries),
    addVersion: jest.fn(),
    appendEntry: jest.fn(),
    setWirdLevel: jest.fn(),
  }
}

describe('StatsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-09-15T12:00:00.000Z'))
    mockedUseSQLiteContext.mockReturnValue({} as ReturnType<typeof useSQLiteContext>)
    mockedUseWirdRepository.mockReturnValue(repository())
    mockedCreateQadaRepository.mockReturnValue({
      listQadaEvents: jest.fn(async () => qadaEvents),
      addQadaDebt: jest.fn(),
      payQadaPrayer: jest.fn(),
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders seven-day stats and the qada link from SQLite repositories', async () => {
    render(<StatsRoute />)

    await waitFor(() => expect(screen.getByTestId('stats-week-chart')).toBeTruthy())

    expect(screen.getAllByTestId(/stats-bar-/)).toHaveLength(7)
    expect(screen.getByTestId('stats-current-streak')).toHaveTextContent('١')
    expect(screen.getByTestId('stats-best-streak')).toHaveTextContent('١')
    expect(screen.getByTestId('stats-summary')).toHaveTextContent('٢/٣')
    expect(screen.getByText('الأساس')).toBeTruthy()
    expect(screen.getByText('الأول')).toBeTruthy()
    expect(screen.getByText('الاثنين')).toBeTruthy()
    expect(screen.getByTestId('stats-qada-link')).toBeTruthy()
  })

  it('resolves a historical day against the version in force on that day', async () => {
    render(<StatsRoute />)

    await waitFor(() => expect(screen.getByTestId('stats-week-chart')).toBeTruthy())

    expect(screen.getByTestId('stats-bar-2026-09-14').props.style).toEqual(
      expect.objectContaining({ height: '100%' }),
    )
    expect(screen.getByTestId('stats-bar-2026-09-15').props.style).toEqual(
      expect.objectContaining({ height: '50%' }),
    )
  })

  it('renders a recoverable error when stored wird JSON cannot be read', async () => {
    const brokenRepository = repository()
    brokenRepository.listVersions = jest.fn(async () => {
      throw new SyntaxError('Unexpected end of JSON input')
    })
    mockedUseWirdRepository.mockReturnValue(brokenRepository)

    render(<StatsRoute />)

    await waitFor(() => expect(screen.getByTestId('stats-error')).toBeTruthy())
    expect(screen.getByText('حدث خطأ ما. حاول مرة أخرى.')).toBeTruthy()
    expect(screen.getByTestId('stats-retry')).toBeTruthy()
    expect(screen.queryByTestId('stats-summary')).toBeNull()

    brokenRepository.listVersions = jest.fn(async () => versions)
    await fireEvent.press(screen.getByTestId('stats-retry'))

    await waitFor(() => expect(screen.getByTestId('stats-summary')).toBeTruthy())
  })

  it('renders an empty stats projection without inventing item statistics', async () => {
    const emptyRepository = repository()
    emptyRepository.listVersions = jest.fn(async () => [])
    emptyRepository.getEntriesInRange = jest.fn(async () => [])
    emptyRepository.getAllEntries = jest.fn(async () => [])
    mockedUseWirdRepository.mockReturnValue(emptyRepository)

    render(<StatsRoute />)

    await waitFor(() => expect(screen.getByTestId('stats-summary')).toBeTruthy())

    expect(screen.getByTestId('stats-summary')).toHaveTextContent('٠/٠')
    expect(screen.queryByTestId('stats-item-first')).toBeNull()
  })
})
