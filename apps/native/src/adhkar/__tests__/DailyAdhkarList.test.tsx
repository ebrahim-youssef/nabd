import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { ChecklistAreaView, Result, WirdEntry } from '@nabd/shared'

import { DailyAdhkarList } from '../DailyAdhkarList'

const mockChecklist = {
  isLoading: false,
  areas: [] as ChecklistAreaView[],
  versionId: 'version-1',
  refresh: jest.fn(),
}

const mockUseFocusEffect = jest.fn()

const mockRepository = {
  completeLinkedWirdItem: jest.fn<Promise<Result<WirdEntry | null>>, [string, string, number]>(),
}

jest.mock('../../wird/useWirdChecklist', () => ({
  useWirdChecklist: () => mockChecklist,
}))

jest.mock('expo-router', () => ({
  useFocusEffect: (...args: unknown[]) => mockUseFocusEffect(...args),
}))

jest.mock('../../counter/db', () => ({
  createDhikrCompletionRepository: () => mockRepository,
}))

jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => ({}) }))

function withDailyItems(items: ChecklistAreaView['items']) {
  mockChecklist.areas = [{ id: 'adhkar', label: 'الأذكار', order: 1, items }]
}

describe('DailyAdhkarList', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-09-20T12:00:00.000Z'))
    mockChecklist.isLoading = false
    mockChecklist.areas = []
    mockChecklist.refresh.mockReset()
    mockRepository.completeLinkedWirdItem.mockReset()
    mockRepository.completeLinkedWirdItem.mockResolvedValue({ ok: true, value: null })
    mockUseFocusEffect.mockReset()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders exactly five cards from the shared daily content', async () => {
    await render(<DailyAdhkarList />)

    expect(screen.getAllByTestId(/adhkar-daily-card-/)).toHaveLength(5)
  })

  it('increments to the live wird target, caps, and completes the linked item once', async () => {
    withDailyItems([
      {
        id: 'istighfar',
        label: 'الاستغفار',
        kind: 'counter',
        target: 3,
        done: false,
      },
    ])
    await render(<DailyAdhkarList />)
    const card = screen.getByTestId('adhkar-daily-card-istighfar')

    await fireEvent.press(card)
    await fireEvent.press(card)
    await fireEvent.press(card)
    await fireEvent.press(card)

    expect(screen.getByTestId('adhkar-daily-progress-istighfar')).toHaveTextContent('٣/٣')
    expect(mockRepository.completeLinkedWirdItem).toHaveBeenCalledTimes(1)
  })

  it('falls back to the content repeat when the linked item is unavailable', async () => {
    await render(<DailyAdhkarList />)
    const card = screen.getByTestId('adhkar-daily-card-istighfar')

    await fireEvent.press(card)
    expect(screen.getByTestId('adhkar-daily-progress-istighfar')).toHaveTextContent('١/١٠')
    expect(mockRepository.completeLinkedWirdItem).not.toHaveBeenCalled()
  })

  it('lets a local reset override linked completion without deleting it', async () => {
    withDailyItems([
      {
        id: 'istighfar',
        label: 'الاستغفار',
        kind: 'counter',
        target: 3,
        done: true,
      },
    ])
    await render(<DailyAdhkarList />)

    expect(screen.getByTestId('adhkar-daily-progress-istighfar')).toHaveTextContent('٣/٣')
    await fireEvent.press(screen.getByTestId('adhkar-daily-reset-istighfar'))

    expect(screen.getByTestId('adhkar-daily-progress-istighfar')).toHaveTextContent('٠/٣')
    expect(mockRepository.completeLinkedWirdItem).not.toHaveBeenCalled()
  })

  it('resets in-memory counts and refreshes the checklist after a new day gains focus', async () => {
    await render(<DailyAdhkarList />)
    const card = screen.getByTestId('adhkar-daily-card-istighfar')
    await fireEvent.press(card)
    expect(screen.getByTestId('adhkar-daily-progress-istighfar')).toHaveTextContent('١/١٠')

    jest.setSystemTime(new Date('2026-09-21T12:00:00.000Z'))
    const focus = mockUseFocusEffect.mock.calls[0]?.[0] as () => undefined
    await act(async () => focus())

    expect(screen.getByTestId('adhkar-daily-progress-istighfar')).toHaveTextContent('٠/١٠')
    expect(mockChecklist.refresh).toHaveBeenCalled()
  })
})
