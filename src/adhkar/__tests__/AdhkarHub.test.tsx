import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native'

import { ADHKAR_LIBRARY } from '../../content/adhkar'
import { formatAdhkarCount } from '../copy'
import { AdhkarRoute } from '../AdhkarRoute'

const mockPush = jest.fn()
const mockReadProgress = jest.fn()
const mockReadLinked = jest.fn()
const mockPlan = {
  openTimedActs: [{ id: 'morning-adhkar' }],
  timedActs: [] as { id: string; items: unknown[] }[],
}

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
}))
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDatabase }))
const mockDatabase = {}
jest.mock('lucide-react-native', () => ({
  ChevronLeft: () => null,
  ArrowRight: () => null,
  Check: () => null,
  ChevronDown: () => null,
  ChevronUp: () => null,
  RotateCcw: () => null,
}))
jest.mock('../../day-plan/WirdTodayProvider', () => ({ useWirdToday: () => '2026-09-20' }))
jest.mock('../../onboarding/db', () => ({
  createOnboardingRepository: () => ({ load: async () => ({ activeWird: {} }) }),
}))
jest.mock('../../home/useHomeDayPlan', () => ({
  useHomeDayPlan: () => ({ status: 'ready', plan: mockPlan }),
}))
jest.mock('../db', () => ({
  createAdhkarRepository: () => ({
    readFlowProgress: mockReadProgress,
    isLinkedWirdItemDone: mockReadLinked,
  }),
}))

describe('AdhkarRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPlan.openTimedActs = [{ id: 'morning-adhkar' }]
    mockPlan.timedActs = []
    mockReadProgress.mockResolvedValue({ index: 2, count: 0, finished: false })
    mockReadLinked.mockResolvedValue(false)
  })

  it('shows the current morning set and its saved progress', async () => {
    render(<AdhkarRoute />)
    await waitFor(() => expect(screen.getByTestId('adhkar-now-morning')).toBeTruthy(), {
      timeout: 5000,
    })
    await waitFor(() => expect(screen.getAllByText(/٢ من/).length).toBeGreaterThan(0), {
      timeout: 5000,
    })
    expect(screen.getAllByText(/٢ من/)).toHaveLength(1)
    expect(screen.queryByText(/مطلوبة/)).toBeNull()
    expect(screen.queryByTestId('page-back')).toBeNull()
    fireEvent.press(screen.getByText('أكمل'))
    expect(mockPush).toHaveBeenCalledWith('/adhkar/morning')
  })

  it('shows the evening set in its window', async () => {
    mockPlan.openTimedActs = [{ id: 'evening-adhkar' }]
    render(<AdhkarRoute />)
    await waitFor(() => expect(screen.getByTestId('adhkar-now-evening')).toBeTruthy(), {
      timeout: 5000,
    })
  })

  it('lists every set when no window is available', async () => {
    mockPlan.openTimedActs = []
    render(<AdhkarRoute />)
    await waitFor(() => expect(screen.getByTestId('adhkar-row-morning')).toBeTruthy(), {
      timeout: 5000,
    })
    for (const category of ADHKAR_LIBRARY)
      expect(screen.getByTestId(`adhkar-row-${category.id}`)).toBeTruthy()
  })

  it('identifies a linked morning set and leaves its title room to scale', async () => {
    mockPlan.openTimedActs = []
    mockPlan.timedActs = [{ id: 'morning-adhkar', items: [{}] }]
    render(<AdhkarRoute />)
    await waitFor(() => expect(screen.getByTestId('adhkar-row-morning')).toBeTruthy())
    const row = within(screen.getByTestId('adhkar-row-morning'))
    await waitFor(() => expect(row.getByText(/من وِردك اليوم/)).toBeTruthy())
    expect(row.getByText('أذكار الصباح').props.className).toContain('text-body')
  })

  it('opens each other category from its row', async () => {
    render(<AdhkarRoute />)
    await waitFor(() => expect(screen.getByTestId('adhkar-row-evening')).toBeTruthy(), {
      timeout: 5000,
    })
    for (const category of ADHKAR_LIBRARY.filter((item) => item.id !== 'morning')) {
      fireEvent.press(screen.getByTestId(`adhkar-row-${category.id}`))
      expect(mockPush).toHaveBeenCalledWith(`/adhkar/${category.id}`)
    }
  })
})

describe('formatAdhkarCount', () => {
  it('uses Arabic agreement for singular, dual, plural and larger numbers', () => {
    expect([0, 1, 2, 3, 10, 11, 100, 103].map(formatAdhkarCount)).toEqual([
      '٠ ذكرًا',
      'ذِكر واحد',
      'ذِكران',
      '٣ أذكار',
      '١٠ أذكار',
      '١١ ذكرًا',
      '١٠٠ ذكر',
      '١٠٣ أذكار',
    ])
  })
})
