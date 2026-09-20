import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { AdhkarProgressRepository, Dhikr, FlowState, Result, WirdEntry } from '@nabd/shared'

import { useAdhkarFlow } from '../useAdhkarFlow'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => ({}) }))

type Progress = Awaited<ReturnType<AdhkarProgressRepository['readFlowProgress']>>

const mockRepository = {
  readFlowProgress: jest.fn<Promise<Progress>, [string, string]>(),
  writeFlowProgress: jest.fn<Promise<void>, [string, string, FlowState]>(),
  clearFlowProgress: jest.fn<Promise<void>, [string]>(),
  isLinkedWirdItemDone: jest.fn<Promise<boolean>, [string, string]>(),
  completeLinkedWirdItem: jest.fn<Promise<Result<WirdEntry | null>>, [string, string, number]>(),
}

jest.mock('../db', () => ({
  createAdhkarRepository: () => mockRepository,
}))

const ITEMS: Dhikr[] = [
  { id: 'morning-1', text: 'ذكر', repeat: 1 },
  { id: 'morning-2', text: 'ذكر آخر', repeat: 1 },
]
const DAY = '2026-09-20'

describe('useAdhkarFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRepository.readFlowProgress.mockResolvedValue(undefined)
    mockRepository.isLinkedWirdItemDone.mockResolvedValue(false)
    mockRepository.completeLinkedWirdItem.mockResolvedValue({ ok: true, value: null })
  })

  it('resumes saved morning progress and appends one linked completion at the end', async () => {
    mockRepository.readFlowProgress.mockResolvedValue({
      categoryId: 'morning',
      day: DAY,
      index: 1,
      count: 0,
      finished: false,
    })
    const { result } = renderHook(() => useAdhkarFlow('morning', ITEMS, DAY, () => 123))

    await waitFor(() => expect(result.current.state.index).toBe(1))
    await act(async () => result.current.tap())

    expect(mockRepository.writeFlowProgress).toHaveBeenCalledWith('morning', DAY, {
      index: 1,
      count: 1,
      finished: true,
    })
    expect(mockRepository.completeLinkedWirdItem).toHaveBeenCalledWith('2026-09-20', 'morning', 123)
  })

  it('shows a pre-existing linked wird completion as finished', async () => {
    mockRepository.isLinkedWirdItemDone.mockResolvedValue(true)
    const { result } = renderHook(() => useAdhkarFlow('morning', ITEMS, DAY))

    await waitFor(() => expect(result.current.state.finished).toBe(true))
    expect(result.current.markedInWird).toBe(true)
  })

  it('resets repeatable categories when their route is revisited', async () => {
    const { result, rerender } = renderHook(
      ({ categoryId }: { categoryId: string }) => useAdhkarFlow(categoryId, ITEMS, DAY),
      { initialProps: { categoryId: 'morning' } },
    )
    await act(async () => result.current.tap())
    expect(result.current.state.index).toBe(1)

    rerender({ categoryId: 'sleep' })
    expect(result.current.state).toEqual({ index: 0, count: 0, finished: false })
    expect(mockRepository.writeFlowProgress).toHaveBeenCalledTimes(1)
  })

  it('does not let an old category hydration overwrite the current flow', async () => {
    let resolveLinked: (value: boolean) => void = () => undefined
    mockRepository.isLinkedWirdItemDone.mockImplementation(
      () => new Promise<boolean>((resolve) => (resolveLinked = resolve)),
    )
    const { result, rerender } = renderHook(
      ({ categoryId }: { categoryId: string }) => useAdhkarFlow(categoryId, ITEMS, DAY),
      { initialProps: { categoryId: 'morning' } },
    )

    await waitFor(() => expect(mockRepository.isLinkedWirdItemDone).toHaveBeenCalled())
    rerender({ categoryId: 'sleep' })
    await act(async () => resolveLinked(true))
    await act(async () => result.current.tap())

    expect(result.current.state.index).toBe(1)
  })

  it('keeps an immediate tap when saved hydration resolves later', async () => {
    let resolveSaved: (value: Progress | undefined) => void = () => undefined
    mockRepository.readFlowProgress.mockImplementation(
      () => new Promise<Progress | undefined>((resolve) => (resolveSaved = resolve)),
    )
    const { result } = renderHook(() => useAdhkarFlow('morning', ITEMS, DAY))

    await waitFor(() => expect(mockRepository.readFlowProgress).toHaveBeenCalled())
    await act(async () => result.current.tap())
    await act(async () =>
      resolveSaved({ categoryId: 'morning', day: DAY, index: 0, count: 0, finished: false }),
    )

    expect(result.current.state.index).toBe(1)
  })
})
