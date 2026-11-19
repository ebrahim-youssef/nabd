import { act, renderHook } from '@testing-library/react-native'
import { DAILY_ADHKAR_CATEGORY } from '../../content/daily-adhkar'
import type { Result } from '../../lib/result'
import type { ChecklistAreaView, WirdEntry } from '../../wird/types'
import { computeDailyItemState } from '../logic'
import { useDailyAdhkarProgress } from '../useDailyAdhkarProgress'
import { refreshLiveRepositoryQueries } from '../../shell/useLiveRepositoryQuery'

jest.mock('../../shell/useLiveRepositoryQuery', () => ({ refreshLiveRepositoryQueries: jest.fn() }))

let mockToday = '2026-09-20'
const mockChecklist = { isLoading: false, areas: [] as ChecklistAreaView[], refresh: jest.fn() }
const mockUseFocusEffect = jest.fn()
const mockDatabase = {}
const mockRepository = {
  completeLinkedWirdItem: jest.fn<Promise<Result<WirdEntry | null>>, [string, string, number]>(),
}
jest.mock('../../day-plan/WirdTodayProvider', () => ({ useWirdToday: () => mockToday }))
jest.mock('../../wird/useWirdChecklist', () => ({ useWirdChecklist: () => mockChecklist }))
jest.mock('expo-router', () => ({
  useFocusEffect: (...args: unknown[]) => mockUseFocusEffect(...args),
}))
jest.mock('../../counter/db', () => ({ createDhikrCompletionRepository: () => mockRepository }))
jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => mockDatabase }))

const item = DAILY_ADHKAR_CATEGORY.items[0]
function setItem(target: number, done = false) {
  mockChecklist.areas = [
    {
      id: 'adhkar',
      label: 'الأذكار',
      order: 1,
      items: [{ id: item.id, label: 'الاستغفار', kind: 'counter', target, done }],
    },
  ]
}
function state(result: ReturnType<typeof useDailyAdhkarProgress>) {
  const linked = result.checklistItems.get(item.id)
  return computeDailyItemState(result.counts[item.id], linked?.target, linked?.done, item.repeat)
}
function press(result: ReturnType<typeof useDailyAdhkarProgress>) {
  return result.tap(item, result.checklistItems.get(item.id))
}

describe('daily reader progress', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-09-20T12:00:00.000Z'))
    mockToday = '2026-09-20'
    mockChecklist.isLoading = false
    mockChecklist.areas = []
    mockChecklist.refresh.mockReset()
    mockUseFocusEffect.mockReset()
    mockRepository.completeLinkedWirdItem.mockReset()
    mockRepository.completeLinkedWirdItem.mockResolvedValue({ ok: true, value: null })
  })
  afterEach(() => jest.useRealTimers())

  it.each([
    [{ ok: true, value: { id: 'entry' } as WirdEntry }, 1],
    [{ ok: true, value: null }, 0],
    [{ ok: false, error: 'write failed' }, 0],
  ] as const)(
    'refreshes live queries only after an applied daily completion',
    async (completion, calls) => {
      setItem(1)
      mockRepository.completeLinkedWirdItem.mockResolvedValue(completion)
      const { result } = renderHook(() => useDailyAdhkarProgress())
      await act(async () => {
        await press(result.current)
      })
      expect(refreshLiveRepositoryQueries).toHaveBeenCalledTimes(calls)
    },
  )

  it('increments to the live wird target, caps, and completes the linked item once', async () => {
    setItem(3)
    const { result } = renderHook(() => useDailyAdhkarProgress())
    await act(async () => {
      await press(result.current)
    })
    await act(async () => {
      await press(result.current)
    })
    await act(async () => {
      await press(result.current)
    })
    await act(async () => {
      await press(result.current)
    })
    expect(state(result.current)).toMatchObject({ count: 3, target: 3, done: true })
    expect(mockRepository.completeLinkedWirdItem).toHaveBeenCalledTimes(1)
  })

  it.each(['failure result', 'rejected write'])(
    'rolls back a %s and lets the user retry',
    async (failure) => {
      setItem(1)
      if (failure === 'failure result')
        mockRepository.completeLinkedWirdItem.mockResolvedValueOnce({
          ok: false,
          error: 'write failed',
        })
      else mockRepository.completeLinkedWirdItem.mockRejectedValueOnce(new Error('write failed'))
      const { result } = renderHook(() => useDailyAdhkarProgress())
      await act(async () => {
        await press(result.current)
      })
      expect(state(result.current)).toMatchObject({ count: 0, done: false })
      expect(result.current.failedItems[item.id]).toBe(true)
      await act(async () => {
        await press(result.current)
      })
      expect(state(result.current)).toMatchObject({ count: 1, done: true })
      expect(result.current.failedItems[item.id]).toBeUndefined()
    },
  )

  it('does not roll back a reset after a target-reaching completion fails', async () => {
    setItem(1)
    let resolveCompletion: (value: Result<WirdEntry | null>) => void = () => undefined
    mockRepository.completeLinkedWirdItem.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveCompletion = resolve
      }),
    )
    const { result } = renderHook(() => useDailyAdhkarProgress())
    await act(async () => {
      void press(result.current)
      await Promise.resolve()
    })
    act(() => result.current.reset(item.id))
    await act(async () => {
      resolveCompletion({ ok: false, error: 'write failed' })
      await Promise.resolve()
    })
    expect(state(result.current)).toMatchObject({ count: 0, done: false })
    expect(result.current.failedItems[item.id]).toBeUndefined()
  })

  it('keeps the previous wird day after midnight and resets when it advances at Fajr', async () => {
    setItem(3)
    const view = renderHook((_: { tick: number }) => useDailyAdhkarProgress(), {
      initialProps: { tick: 0 },
    })
    await act(async () => {
      await press(view.result.current)
    })
    jest.setSystemTime(new Date('2026-09-20T22:00:00.000Z'))
    view.rerender({ tick: 1 })
    expect(state(view.result.current).count).toBe(1)
    mockToday = '2026-09-21'
    view.rerender({ tick: 2 })
    expect(state(view.result.current).count).toBe(0)
  })

  it('ignores a stale failure after reset and recount so the newer completion stays done', async () => {
    setItem(1)
    let rejectFirst: (cause: Error) => void = () => undefined
    mockRepository.completeLinkedWirdItem.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectFirst = reject
      }),
    )
    const { result } = renderHook(() => useDailyAdhkarProgress())
    await act(async () => {
      void press(result.current)
      await Promise.resolve()
    })
    act(() => result.current.reset(item.id))
    await act(async () => {
      void press(result.current)
      await Promise.resolve()
    })
    await act(async () => {
      rejectFirst(new Error('write failed'))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(state(result.current)).toMatchObject({ count: 1, done: true })
    expect(result.current.failedItems[item.id]).toBeUndefined()
  })

  it('falls back to the content repeat when the linked item is unavailable', async () => {
    const { result } = renderHook(() => useDailyAdhkarProgress())
    await act(async () => {
      await press(result.current)
    })
    expect(state(result.current)).toMatchObject({ count: 1, target: item.repeat })
    expect(mockRepository.completeLinkedWirdItem).not.toHaveBeenCalled()
  })

  it('lets a local reset override linked completion without deleting it', () => {
    setItem(3, true)
    const { result } = renderHook(() => useDailyAdhkarProgress())
    expect(state(result.current).count).toBe(3)
    act(() => result.current.reset(item.id))
    expect(state(result.current).count).toBe(0)
    expect(mockRepository.completeLinkedWirdItem).not.toHaveBeenCalled()
  })

  it('resets in-memory counts and refreshes the checklist after a new day gains focus', async () => {
    const view = renderHook((_: { tick: number }) => useDailyAdhkarProgress(), {
      initialProps: { tick: 0 },
    })
    await act(async () => {
      await press(view.result.current)
    })
    expect(state(view.result.current).count).toBe(1)
    mockToday = '2026-09-21'
    view.rerender({ tick: 1 })
    const focus = mockUseFocusEffect.mock.calls.at(-1)?.[0] as () => undefined
    act(() => focus())
    expect(state(view.result.current).count).toBe(0)
    expect(mockChecklist.refresh).toHaveBeenCalled()
  })
})
