import { fireEvent, render, screen } from '@testing-library/react-native'

import { ADHKAR_COPY, ADHKAR_LIBRARY } from '@nabd/shared'

import { AdhkarRoute } from '../AdhkarRoute'

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), canGoBack: () => false, replace: jest.fn() }),
  useFocusEffect: jest.fn(),
}))

jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => ({}) }))

jest.mock('../../wird/useWirdChecklist', () => ({
  useWirdChecklist: () => ({ isLoading: false, areas: [], versionId: null, refresh: jest.fn() }),
}))

jest.mock('../../counter/db', () => ({
  createDhikrCompletionRepository: () => ({ completeLinkedWirdItem: jest.fn() }),
}))

jest.mock('lucide-react-native', () => ({
  ArrowRight: () => null,
  Check: () => null,
  ChevronDown: () => null,
  ChevronUp: () => null,
  RotateCcw: () => null,
}))

jest.mock('../useAdhkarFlow', () => ({
  useAdhkarFlow: () => ({
    state: { index: 0, count: 0, finished: false },
    tap: jest.fn(),
    restart: jest.fn(),
    markedInWird: false,
  }),
}))

describe('AdhkarRoute', () => {
  it('shows the adhkar library and morning flow', async () => {
    await render(<AdhkarRoute />)

    expect(screen.getByText(ADHKAR_COPY.libraryTitle)).toBeTruthy()
    expect(screen.getByTestId('adhkar-category-morning')).toBeTruthy()
    expect(screen.getByTestId('adhkar-flow-morning')).toBeTruthy()
  })

  it('switches between morning and evening categories', async () => {
    await render(<AdhkarRoute />)

    await fireEvent.press(screen.getByTestId('adhkar-category-evening'))
    expect(screen.getByTestId('adhkar-flow-evening')).toBeTruthy()
  })

  it('renders the repeatable list for after-prayer and sleep categories', async () => {
    await render(<AdhkarRoute />)

    await fireEvent.press(screen.getByTestId('adhkar-category-after-prayer'))
    expect(screen.getByTestId('adhkar-list-after-prayer')).toBeTruthy()

    await fireEvent.press(screen.getByTestId('adhkar-category-sleep'))
    expect(screen.getByTestId('adhkar-list-sleep')).toBeTruthy()
  })

  it('resets repeatable counts when a category is remounted', async () => {
    await render(<AdhkarRoute />)

    await fireEvent.press(screen.getByTestId('adhkar-category-after-prayer'))
    const itemId = ADHKAR_LIBRARY.find((entry) => entry.id === 'after-prayer')?.items[0]?.id
    expect(itemId).toBeTruthy()
    const progress = screen.getByTestId(`adhkar-list-progress-${itemId}`)

    await fireEvent.press(screen.getByTestId(`adhkar-list-count-${itemId}`))
    expect(progress).toHaveTextContent('١/١')

    await fireEvent.press(screen.getByTestId('adhkar-category-sleep'))
    await fireEvent.press(screen.getByTestId('adhkar-category-after-prayer'))

    expect(screen.getByTestId(`adhkar-list-progress-${itemId}`)).toHaveTextContent('٠/١')
  })

  it('renders five daily cards when the daily category is selected', async () => {
    await render(<AdhkarRoute />)

    await fireEvent.press(screen.getByTestId('adhkar-category-daily'))

    expect(screen.getAllByTestId(/adhkar-daily-card-/)).toHaveLength(5)
  })
})
