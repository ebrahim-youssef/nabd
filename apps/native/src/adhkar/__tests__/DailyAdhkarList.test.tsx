import { act, fireEvent, render, screen } from '@testing-library/react-native'
import type { Result } from '../../lib/result'
import type { ChecklistAreaView, WirdEntry } from '../../wird/types'

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

    await act(async () => {
      await fireEvent.press(card)
    })
    await act(async () => {
      await fireEvent.press(card)
    })
    await act(async () => {
      await fireEvent.press(card)
    })
    await act(async () => {
      await fireEvent.press(card)
    })

    expect(screen.getByTestId('adhkar-daily-progress-istighfar')).toHaveTextContent('٣/٣')
    expect(mockRepository.completeLinkedWirdItem).toHaveBeenCalledTimes(1)
  })

  it('rolls back a failed completion and lets the user retry it', async () => {
    withDailyItems([
      {
        id: 'istighfar',
        label: 'الاستغفار',
        kind: 'counter',
        target: 1,
        done: false,
      },
    ])
    mockRepository.completeLinkedWirdItem.mockResolvedValueOnce({
      ok: false,
      error: 'write failed',
    })

    await render(<DailyAdhkarList />)
    const card = screen.getByTestId('adhkar-daily-card-istighfar')

    await act(async () => {
      await fireEvent.press(card)
    })

    expect(screen.getByTestId('adhkar-daily-progress-istighfar')).toHaveTextContent('٠/١')
    expect(screen.getByTestId('adhkar-daily-card-istighfar').props.accessibilityState).toEqual({
      checked: false,
      disabled: false,
    })
    expect(screen.getByText('تعذّر الحفظ، اضغط مرة أخرى.')).toBeTruthy()

    await act(async () => {
      await fireEvent.press(screen.getByTestId('adhkar-daily-card-istighfar'))
    })

    expect(screen.getByTestId('adhkar-daily-progress-istighfar')).toHaveTextContent('١/١')
    expect(screen.getByTestId('adhkar-daily-card-istighfar').props.accessibilityState).toEqual({
      checked: true,
      disabled: true,
    })
    expect(screen.queryByText('تعذّر الحفظ، اضغط مرة أخرى.')).toBeNull()
  })

  it('rolls back a rejected completion and lets the user retry it', async () => {
    withDailyItems([
      {
        id: 'istighfar',
        label: 'الاستغفار',
        kind: 'counter',
        target: 1,
        done: false,
      },
    ])
    mockRepository.completeLinkedWirdItem.mockRejectedValueOnce(new Error('write failed'))

    await render(<DailyAdhkarList />)
    const card = screen.getByTestId('adhkar-daily-card-istighfar')

    await act(async () => {
      await fireEvent.press(card)
    })

    expect(screen.getByTestId('adhkar-daily-progress-istighfar')).toHaveTextContent('٠/١')
    expect(screen.getByTestId('adhkar-daily-card-istighfar').props.accessibilityState).toEqual({
      checked: false,
      disabled: false,
    })
    expect(screen.getByText('تعذّر الحفظ، اضغط مرة أخرى.')).toBeTruthy()

    await act(async () => {
      await fireEvent.press(screen.getByTestId('adhkar-daily-card-istighfar'))
    })

    expect(screen.getByTestId('adhkar-daily-progress-istighfar')).toHaveTextContent('١/١')
    expect(screen.getByTestId('adhkar-daily-card-istighfar').props.accessibilityState).toEqual({
      checked: true,
      disabled: true,
    })
    expect(screen.queryByText('تعذّر الحفظ، اضغط مرة أخرى.')).toBeNull()
  })

  it('does not roll back a reset after a target-reaching completion fails', async () => {
    withDailyItems([
      {
        id: 'istighfar',
        label: 'الاستغفار',
        kind: 'counter',
        target: 3,
        done: false,
      },
    ])
    let resolveCompletion: (result: Result<WirdEntry | null>) => void = () => undefined
    const completion = new Promise<Result<WirdEntry | null>>((resolve) => {
      resolveCompletion = resolve
    })
    mockRepository.completeLinkedWirdItem.mockReturnValueOnce(completion)

    await render(<DailyAdhkarList />)
    const card = screen.getByTestId('adhkar-daily-card-istighfar')

    await act(async () => {
      await fireEvent.press(card)
    })
    await act(async () => {
      await fireEvent.press(card)
    })
    await act(async () => {
      fireEvent.press(card)
    })
    await act(async () => {
      await fireEvent.press(screen.getByTestId('adhkar-daily-reset-istighfar'))
    })

    await act(async () => {
      resolveCompletion({ ok: false, error: 'write failed' })
    })

    expect(screen.getByTestId('adhkar-daily-progress-istighfar')).toHaveTextContent('٠/٣')
    expect(screen.queryByText('تعذّر الحفظ، اضغط مرة أخرى.')).toBeNull()
  })

  it('clears the day before ignoring a tap after midnight without writing the old day', async () => {
    withDailyItems([
      {
        id: 'istighfar',
        label: 'الاستغفار',
        kind: 'counter',
        target: 1,
        done: false,
      },
    ])
    await render(<DailyAdhkarList />)
    jest.setSystemTime(new Date('2026-09-21T12:00:00.000Z'))

    await fireEvent.press(screen.getByTestId('adhkar-daily-card-istighfar'))

    expect(screen.getByTestId('adhkar-daily-progress-istighfar')).toHaveTextContent('٠/١')
    expect(mockRepository.completeLinkedWirdItem).not.toHaveBeenCalled()
  })

  it('ignores a stale failure after reset and recount so the newer completion stays done', async () => {
    withDailyItems([
      {
        id: 'istighfar',
        label: 'الاستغفار',
        kind: 'counter',
        target: 1,
        done: false,
      },
    ])
    let rejectFirstCompletion: (cause: Error) => void = () => undefined
    const firstCompletion = new Promise<Result<WirdEntry | null>>((_, reject) => {
      rejectFirstCompletion = reject
    })
    mockRepository.completeLinkedWirdItem
      .mockReturnValueOnce(firstCompletion)
      .mockResolvedValueOnce({ ok: true, value: null })

    await render(<DailyAdhkarList />)
    const card = screen.getByTestId('adhkar-daily-card-istighfar')
    const reset = screen.getByTestId('adhkar-daily-reset-istighfar')

    await act(async () => {
      fireEvent.press(card)
      await Promise.resolve()
    })
    await fireEvent.press(reset)
    await act(async () => {
      fireEvent.press(screen.getByTestId('adhkar-daily-card-istighfar'))
      await Promise.resolve()
    })

    await act(async () => {
      rejectFirstCompletion(new Error('write failed'))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByTestId('adhkar-daily-progress-istighfar')).toHaveTextContent('١/١')
    expect(screen.queryByText('تعذّر الحفظ، اضغط مرة أخرى.')).toBeNull()
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
