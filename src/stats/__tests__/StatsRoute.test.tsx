import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'

import type { QadaEvent } from '../../db/contracts'
import type { WirdEntry, WirdVersion } from '../../wird/types'
import { useSQLiteContext } from 'expo-sqlite'
import { Share } from 'react-native'

import StatsRoute from '../../../app/(tabs)/stats'
import { createQadaRepository } from '../../qada/db'
import { useWirdRepository } from '../../wird/useWirdRepository'
import type { NativeWirdRepository } from '../../wird/db'
import { ItemStatsSection } from '../ItemStatsSection'
import { useWirdToday } from '../../day-plan/WirdTodayProvider'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: jest.fn() }))
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    canGoBack: () => false,
    replace: jest.fn(),
    push: mockPush,
  }),
  useFocusEffect: jest.fn(),
}))
jest.mock('lucide-react-native', () => ({
  ArrowRight: () => null,
  ChevronDown: () => null,
  ChevronUp: () => null,
  ChevronLeft: () => null,
}))
jest.mock('../../wird/useWirdRepository', () => ({ useWirdRepository: jest.fn() }))
jest.mock('../../qada/db', () => ({ createQadaRepository: jest.fn() }))
jest.mock('../../day-plan/WirdTodayProvider', () => ({ useWirdToday: jest.fn() }))

const mockPush = jest.fn()

const mockedUseSQLiteContext = useSQLiteContext as jest.MockedFunction<typeof useSQLiteContext>
const mockedUseWirdRepository = useWirdRepository as jest.MockedFunction<typeof useWirdRepository>
const mockedCreateQadaRepository = createQadaRepository as jest.MockedFunction<
  typeof createQadaRepository
>
const mockedUseWirdToday = jest.mocked(useWirdToday)

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

function repository(): NativeWirdRepository {
  return {
    listVersions: jest.fn(async () => versions),
    getDayEntries: jest.fn(),
    getMonthEntries: jest.fn(),
    getEntriesInRange: jest.fn(async () => entries),
    getAllEntries: jest.fn(async () => entries),
    readLatestStaleAction: jest.fn(async () => null),
    addVersion: jest.fn(),
    setItemState: jest.fn(),
    healVersionFromLevels: jest.fn(),
    setWirdLevel: jest.fn(),
  }
}

describe('StatsRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-09-15T12:00:00.000Z'))
    mockedUseWirdToday.mockReturnValue('2026-09-15')
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

    await waitFor(() => expect(screen.getByText('إتمام الوِرد — آخر ٧ أيام')).toBeTruthy(), {
      timeout: 5000,
    })

    expect(screen.getByText('يوم واحد متتالٍ')).toBeTruthy()
    expect(screen.getByText('أفضل سلسلة: ١')).toBeTruthy()
    expect(screen.getByText('أتممت وِردك ١ يومًا من ٧، واليوم ٥٠٪ حتى الآن.')).toBeTruthy()
    expect(screen.getByText('الأساس')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: /محاسبة العناصر/ }))
    expect(screen.getByText('الأول')).toBeTruthy()
    fireEvent.press(screen.getByRole('button', { name: /قضاء الفوائت/ }))
    expect(mockPush).toHaveBeenCalledWith('/qada')
  })

  it('shows helpful zero states for streaks, the week, and qada', async () => {
    const empty = repository()
    const incomplete = [{ ...entries[0], done: false }]
    empty.getEntriesInRange = jest.fn(async () => incomplete)
    empty.getAllEntries = jest.fn(async () => incomplete)
    mockedUseWirdRepository.mockReturnValue(empty)
    mockedCreateQadaRepository.mockReturnValue({
      listQadaEvents: jest.fn(async () => []),
      addQadaDebt: jest.fn(),
      payQadaPrayer: jest.fn(),
    })
    render(<StatsRoute />)
    await waitFor(() => expect(screen.getByText('ابدأ سلسلتك اليوم')).toBeTruthy())
    expect(screen.queryByText(/أفضل سلسلة/)).toBeNull()
    expect(
      screen.getByText('لم تُتمّ وردك في الأيام السبعة الماضية بعد، واليوم ٠٪ حتى الآن.'),
    ).toBeTruthy()
    expect(screen.getByText('لا فوائت')).toBeTruthy()
  })

  it('keeps item details collapsed and reveals required and voluntary parity metrics', async () => {
    const detailedVersion: WirdVersion = {
      id: 'detail-version',
      effectiveFrom: '2026-09-13',
      definition: {
        areas: [{ id: 'area', label: 'الأساس', order: 0 }],
        items: [
          { id: 'first', areaId: 'area', label: 'الأول', kind: 'checkbox' },
          {
            id: 'voluntary',
            areaId: 'area',
            label: 'صيام الاثنين',
            kind: 'checkbox',
            optional: true,
            targetDays: [1],
          },
        ],
      },
      createdAt: 1,
    }
    const detailedEntries: WirdEntry[] = [
      {
        id: 'miss-1',
        day: '2026-09-13',
        versionId: detailedVersion.id,
        itemId: 'first',
        done: false,
        at: 1,
      },
      {
        id: 'miss-2',
        day: '2026-09-14',
        versionId: detailedVersion.id,
        itemId: 'first',
        done: false,
        at: 2,
      },
      {
        id: 'voluntary-done',
        day: '2026-09-14',
        versionId: detailedVersion.id,
        itemId: 'voluntary',
        done: true,
        at: 3,
      },
    ]
    const detailedRepository = repository()
    detailedRepository.listVersions = jest.fn(async () => [detailedVersion])
    detailedRepository.getEntriesInRange = jest.fn(async () => detailedEntries)
    detailedRepository.getAllEntries = jest.fn(async () => detailedEntries)
    mockedUseWirdRepository.mockReturnValue(detailedRepository)

    render(<StatsRoute />)

    await waitFor(
      () => expect(screen.getByRole('button', { name: /محاسبة العناصر/ })).toBeTruthy(),
      { timeout: 5000 },
    )

    const toggle = screen.getByRole('button', { name: /محاسبة العناصر/ })
    expect(toggle.props.accessibilityState).toEqual({ expanded: false })
    expect(screen.queryByTestId('stats-item-first')).toBeNull()

    await fireEvent.press(toggle)

    expect(toggle.props.accessibilityState).toEqual({ expanded: true })
    expect(screen.getByTestId('stats-item-first')).toBeTruthy()
    expect(screen.getByTestId('item-consistency-first')).toHaveTextContent('٠٪')
    expect(screen.getByText('٠ متتالية')).toBeTruthy()
    expect(screen.getByTestId('item-missed-first')).toHaveTextContent('فات ٢ (٢ متتالية)')
    expect(screen.getByText('٠/٢ يوم')).toBeTruthy()
    expect(screen.getByTestId('item-progress-first')).toBeTruthy()
    expect(screen.getByTestId('stats-item-voluntary')).toBeTruthy()
    expect(screen.getByText('تطوّع')).toBeTruthy()
    expect(screen.getByText('أُدّيت ١ — أطول تتابع ١ — أيام الاستهداف ١/١')).toBeTruthy()
    expect(screen.queryByTestId('item-missed-voluntary')).toBeNull()
  })

  it('uses the shown percentage for the item progress bar and accessibility value', async () => {
    const item = {
      itemId: 'partial',
      label: 'جزئي',
      optional: false,
      activeDays: 2,
      doneDays: 1,
      missedDays: 1,
      consistency: 0.25,
      currentStreak: 1,
      longestStreak: 1,
      currentMissStreak: 1,
      attainment: null,
    }

    await render(<ItemStatsSection items={[item]} />)
    await fireEvent.press(screen.getByRole('button', { name: /محاسبة العناصر/ }))

    expect(screen.getByTestId('item-consistency-partial')).toHaveTextContent('٥٠٪')
    const progress = screen.getByTestId('item-progress-partial')
    expect(progress.props.accessibilityValue.now).toBe(50)
    expect(progress.props.children.props.style).toEqual({ width: '50%' })
  })

  it('resolves a historical day against the version in force on that day', async () => {
    render(<StatsRoute />)

    await waitFor(() => expect(screen.getByText('إتمام الوِرد — آخر ٧ أيام')).toBeTruthy(), {
      timeout: 5000,
    })

    expect(screen.getByText('أتممت وِردك ١ يومًا من ٧، واليوم ٥٠٪ حتى الآن.')).toBeTruthy()
  })

  it('renders a recoverable error when stored wird JSON cannot be read', async () => {
    const brokenRepository = repository()
    brokenRepository.listVersions = jest.fn(async () => {
      throw new SyntaxError('Unexpected end of JSON input')
    })
    mockedUseWirdRepository.mockReturnValue(brokenRepository)

    render(<StatsRoute />)

    await waitFor(() => expect(screen.getByText('حدث خطأ ما. حاول مرة أخرى.')).toBeTruthy(), {
      timeout: 5000,
    })
    expect(screen.getByText('حدث خطأ ما. حاول مرة أخرى.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeTruthy()
    expect(screen.queryByText('آخر ٣٠ يومًا')).toBeNull()

    brokenRepository.listVersions = jest.fn(async () => versions)
    await fireEvent.press(screen.getByRole('button', { name: 'إعادة المحاولة' }))

    await waitFor(() => expect(screen.getByText('آخر ٣٠ يومًا')).toBeTruthy(), { timeout: 5000 })
  })

  it('renders an empty stats projection without inventing item statistics', async () => {
    const emptyRepository = repository()
    emptyRepository.listVersions = jest.fn(async () => [])
    emptyRepository.getEntriesInRange = jest.fn(async () => [])
    emptyRepository.getAllEntries = jest.fn(async () => [])
    mockedUseWirdRepository.mockReturnValue(emptyRepository)

    render(<StatsRoute />)

    await waitFor(() => expect(screen.getByText('تبدأ إحصاءاتك من اليوم')).toBeTruthy(), {
      timeout: 5000,
    })
    fireEvent.press(screen.getByRole('button', { name: 'افتح اليوم' }))
    expect(mockPush).toHaveBeenCalledWith('/today')
    expect(screen.queryByTestId('stats-item-first')).toBeNull()
  })
  it('shows loading while the first read is pending', () => {
    const pending = repository()
    pending.listVersions = jest.fn(() => new Promise(() => {}))
    mockedUseWirdRepository.mockReturnValue(pending)
    render(<StatsRoute />)
    expect(screen.getByRole('progressbar')).toBeTruthy()
  })

  it('exports the week and month through the existing share action', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction })
    render(<StatsRoute />)
    await waitFor(() => expect(screen.getByText('تصدير آخر أسبوع')).toBeTruthy(), { timeout: 5000 })
    fireEvent.press(screen.getByText('تصدير آخر أسبوع'))
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1))
    expect(share.mock.calls[0][0].title).toContain('week')
    fireEvent.press(screen.getByText('تصدير آخر شهر'))
    await waitFor(() => expect(share).toHaveBeenCalledTimes(2))
    expect(share.mock.calls[1][0].title).toContain('month')
    share.mockRestore()
  })

  it('shows history older than the displayed month', async () => {
    const old = repository()
    old.listVersions = jest.fn(async () => [{ ...versions[0], effectiveFrom: '2026-01-01' }])
    old.getEntriesInRange = jest.fn(async () => [])
    old.getAllEntries = jest.fn(async () => [])
    mockedUseWirdRepository.mockReturnValue(old)
    render(<StatsRoute />)
    await waitFor(() => expect(screen.getByText('آخر ٣٠ يومًا')).toBeTruthy(), { timeout: 5000 })
    expect(screen.queryByText('تبدأ إحصاءاتك من اليوم')).toBeNull()
  })
})
