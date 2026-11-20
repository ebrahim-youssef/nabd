import { act, renderHook } from '@testing-library/react-native'

import { useWirdRepository } from '../useWirdRepository'
import { useToggleItem } from '../useToggleItem'
import { refreshLiveRepositoryQueries } from '../../shell/useLiveRepositoryQuery'
import { buildDayPlan } from '../../day-plan/logic'
import { WIRD_LEVELS } from '../../content/levels'
import { queueWrite } from '../../db/writeQueue'

jest.mock('../useWirdRepository')
jest.mock('../../shell/useLiveRepositoryQuery', () => ({ refreshLiveRepositoryQueries: jest.fn() }))

const mockedUseWirdRepository = useWirdRepository as jest.MockedFunction<typeof useWirdRepository>

describe('useToggleItem', () => {
  beforeEach(() => jest.clearAllMocks())

  it('refreshes live queries for applied and failed writes, including undo', async () => {
    const setItemState = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, value: { outcome: 'applied', entry: null } })
      .mockResolvedValueOnce({ ok: true, value: { outcome: 'applied', entry: null } })
      .mockResolvedValueOnce({ ok: true, value: { outcome: 'unchanged', entry: null } })
      .mockResolvedValueOnce({ ok: true, value: { outcome: 'duplicate', entry: null } })
      .mockResolvedValueOnce({ ok: true, value: { outcome: 'stale', entry: null } })
      .mockResolvedValueOnce({ ok: false, error: 'write failed' })
    mockedUseWirdRepository.mockReturnValue({ setItemState } as never)
    const { result } = renderHook(() => useToggleItem('version-1'))
    for (const [index, done] of [true, false, false, false, false, false].entries()) {
      await act(async () => {
        await result.current.toggle('2026-06-10', 'fajr', done)
      })
      expect(refreshLiveRepositoryQueries).toHaveBeenCalledTimes([1, 2, 2, 2, 3, 4][index])
    }
  })
  it('writes a state change with an action id', async () => {
    const setItemState = jest.fn().mockResolvedValue({
      ok: true,
      value: { outcome: 'applied', entry: null },
    })
    mockedUseWirdRepository.mockReturnValue({ setItemState } as never)
    const onRefresh = jest.fn()
    const { result } = renderHook(() => useToggleItem('version-1', onRefresh))
    let saved = false

    await act(async () => {
      saved = await result.current.toggle('2026-06-10', 'fajr', true)
    })

    expect(saved).toBe(true)
    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(setItemState).toHaveBeenCalledWith(
      expect.objectContaining({
        actionId: expect.any(String),
        day: '2026-06-10',
        versionId: 'version-1',
        itemId: 'fajr',
        done: true,
      }),
    )
  })

  it('reports a stale write as unsuccessful and requests a live refresh', async () => {
    const setItemState = jest.fn().mockResolvedValue({
      ok: true,
      value: { outcome: 'stale', entry: null },
    })
    const onRefresh = jest.fn()
    mockedUseWirdRepository.mockReturnValue({ setItemState } as never)
    const { result } = renderHook(() => useToggleItem('version-1', onRefresh))
    let saved = true

    await act(async () => {
      saved = await result.current.toggle('2026-06-10', 'fajr', true)
    })

    expect(saved).toBe(false)
    expect(onRefresh).not.toHaveBeenCalled()
    expect(refreshLiveRepositoryQueries).toHaveBeenCalledTimes(1)
  })

  it('submits an undo immediately while the first tick is in flight', async () => {
    let releaseFirstWrite: () => void = () => {}
    const firstWrite = new Promise<void>((resolve) => {
      releaseFirstWrite = () => resolve()
    })
    const setItemState = jest
      .fn()
      .mockImplementationOnce(async () => {
        await firstWrite
        return { ok: true, value: { outcome: 'applied', entry: null } }
      })
      .mockResolvedValueOnce({ ok: true, value: { outcome: 'applied', entry: null } })
    mockedUseWirdRepository.mockReturnValue({ setItemState } as never)
    const { result } = renderHook(() => useToggleItem('version-1'))
    let tick: Promise<boolean> = Promise.resolve(false)
    let undo: Promise<boolean> = Promise.resolve(false)

    act(() => {
      tick = result.current.toggle('2026-06-10', 'fajr', true)
      undo = result.current.toggle('2026-06-10', 'fajr', false)
    })
    expect(setItemState).toHaveBeenCalledTimes(2)
    await act(async () => {
      expect(await undo).toBe(true)
    })
    expect(result.current.pendingItemIds.has('fajr')).toBe(true)

    await act(async () => {
      releaseFirstWrite()
      await Promise.all([tick, undo])
    })

    expect(result.current.pendingItemIds.has('fajr')).toBe(false)
    expect(setItemState).toHaveBeenCalledTimes(2)
    expect(setItemState.mock.calls.map(([input]) => input.done)).toEqual([true, false])
    expect(setItemState.mock.calls[0][0].actionId).not.toBe(setItemState.mock.calls[1][0].actionId)
  })

  it('queues both taps before a later linked completion', async () => {
    let release: () => void = () => undefined
    const blocker = queueWrite(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )
    await Promise.resolve()
    const order: string[] = []
    const setItemState = jest.fn(({ done }: { done: boolean }) =>
      queueWrite(async () => {
        order.push(done ? 'on' : 'off')
        return { ok: true, value: { outcome: 'applied', entry: null } }
      }),
    )
    mockedUseWirdRepository.mockReturnValue({ setItemState } as never)
    const { result } = renderHook(() => useToggleItem('version-1'))
    let first: Promise<boolean> = Promise.resolve(false)
    let second: Promise<boolean> = Promise.resolve(false)
    let linked: Promise<void> = Promise.resolve()
    act(() => {
      first = result.current.toggle('2026-06-10', 'fajr', true, false)
      second = result.current.toggle('2026-06-10', 'fajr', false, true)
      linked = queueWrite(async () => {
        order.push('linked')
      })
    })
    expect(setItemState.mock.calls.map(([input]) => input.done)).toEqual([true, false])
    await act(async () => {
      release()
      await Promise.all([blocker, first, second, linked])
    })
    expect(order).toEqual(['on', 'off', 'linked'])
  })

  it('shows a pending tap immediately and restores the saved state on failure', async () => {
    let resolveWrite: (result: unknown) => void = () => undefined
    const setItemState = jest.fn(
      () =>
        new Promise((resolve) => {
          resolveWrite = resolve
        }),
    )
    mockedUseWirdRepository.mockReturnValue({ setItemState } as never)
    const { result } = renderHook(() => useToggleItem('version-1'))
    let write: Promise<boolean> = Promise.resolve(true)
    act(() => {
      write = result.current.toggle('2026-06-10', 'fajr', true, false)
    })
    expect(result.current.getOptimisticDone('2026-06-10', 'fajr', false)).toBe(true)
    await act(async () => {
      resolveWrite({ ok: false, error: 'write failed' })
      await write
    })
    expect(result.current.getOptimisticDone('2026-06-10', 'fajr', false)).toBe(false)
    expect(result.current.hasError).toBe(true)
  })

  it('keeps the last of two rapid taps visible while both writes finish in order', async () => {
    let release: () => void = () => undefined
    const setItemState = jest
      .fn((_input: { done: boolean }) =>
        Promise.resolve({ ok: true, value: { outcome: 'applied' } }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            release = () => resolve({ ok: true, value: { outcome: 'applied' } })
          }),
      )
      .mockResolvedValueOnce({ ok: true, value: { outcome: 'applied' } })
    mockedUseWirdRepository.mockReturnValue({ setItemState } as never)
    const { result } = renderHook(() => useToggleItem('version-1'))
    let first: Promise<boolean> = Promise.resolve(false)
    let second: Promise<boolean> = Promise.resolve(false)
    act(() => {
      first = result.current.toggle('2026-06-10', 'fajr', true, false)
      second = result.current.toggle('2026-06-10', 'fajr', false, false)
    })
    expect(result.current.getOptimisticDone('2026-06-10', 'fajr', true)).toBe(false)
    await act(async () => {
      release()
      await Promise.all([first, second])
    })
    expect(setItemState.mock.calls.map(([input]) => input.done)).toEqual([true, false])
    expect(result.current.getOptimisticDone('2026-06-10', 'fajr', true)).toBe(false)
  })

  it('accepts a newer observed value after a successful write and toggles from it', async () => {
    const setItemState = jest
      .fn()
      .mockResolvedValue({ ok: true, value: { outcome: 'applied', entry: null } })
    mockedUseWirdRepository.mockReturnValue({ setItemState } as never)
    const day = '2026-06-10'
    const plan = buildDayPlan({
      day,
      now: 0,
      times: null,
      nextFajr: null,
      definition: WIRD_LEVELS[0].wird,
      entries: [],
    })
    const itemId = plan.blocks[0].items[0].id
    const firstObservation = {}
    const { result, rerender } = renderHook(
      ({ revision }: { revision: object }) =>
        useToggleItem('version-1', undefined, { day, revision }),
      { initialProps: { revision: firstObservation } },
    )
    await act(async () => {
      await result.current.toggle(day, itemId, true, false)
    })
    expect(result.current.getOptimisticDone(day, itemId, false)).toBe(true)
    rerender({ revision: plan })
    expect(result.current.optimisticItems.has(`${day}:${itemId}`)).toBe(false)
    expect(result.current.getOptimisticDone(day, itemId, plan.blocks[0].items[0].done)).toBe(false)
    await act(async () => {
      await result.current.toggle(
        day,
        itemId,
        !result.current.getOptimisticDone(day, itemId, plan.blocks[0].items[0].done),
        false,
      )
    })
    expect(setItemState).toHaveBeenLastCalledWith(expect.objectContaining({ done: true }))
  })

  it('clears a failed override when a newer plan is observed', async () => {
    mockedUseWirdRepository.mockReturnValue({
      setItemState: jest.fn().mockResolvedValue({ ok: false, error: 'failed' }),
    } as never)
    const day = '2026-06-10'
    const initialPlan = buildDayPlan({
      day,
      now: 0,
      times: null,
      nextFajr: null,
      definition: WIRD_LEVELS[0].wird,
      entries: [],
    })
    const itemId = initialPlan.blocks[0].items[0].id
    const plan = buildDayPlan({
      day,
      now: 0,
      times: null,
      nextFajr: null,
      definition: WIRD_LEVELS[0].wird,
      entries: [{ id: 'other', day, versionId: 'version-1', itemId, done: true, at: 1 }],
    })
    const { result, rerender } = renderHook(
      ({ revision }: { revision: object }) =>
        useToggleItem('version-1', undefined, { day, revision }),
      { initialProps: { revision: {} } },
    )
    await act(async () => {
      await result.current.toggle(day, itemId, true, false)
    })
    expect(result.current.optimisticItems.has(`${day}:${itemId}`)).toBe(true)
    rerender({ revision: plan })
    expect(result.current.optimisticItems.has(`${day}:${itemId}`)).toBe(false)
    expect(result.current.getOptimisticDone(day, itemId, plan.blocks[0].items[0].done)).toBe(true)
  })

  it('keeps an override while its write is pending even if a plan arrives', async () => {
    let release: (value: unknown) => void = () => undefined
    mockedUseWirdRepository.mockReturnValue({
      setItemState: jest.fn(
        () =>
          new Promise((resolve) => {
            release = resolve
          }),
      ),
    } as never)
    const day = '2026-06-10'
    const { result, rerender } = renderHook(
      ({ revision }: { revision: object }) =>
        useToggleItem('version-1', undefined, { day, revision }),
      { initialProps: { revision: {} } },
    )
    let write: Promise<boolean> = Promise.resolve(false)
    act(() => {
      write = result.current.toggle(day, 'fajr', true, false)
    })
    rerender({ revision: {} })
    expect(result.current.getOptimisticDone(day, 'fajr', false)).toBe(true)
    await act(async () => {
      release({ ok: true, value: { outcome: 'applied', entry: null } })
      await write
    })
    rerender({ revision: {} })
    expect(result.current.optimisticItems.has(`${day}:fajr`)).toBe(false)
  })

  it('refreshes after a failed write when a newer observation arrived while pending', async () => {
    let release: (value: unknown) => void = () => undefined
    mockedUseWirdRepository.mockReturnValue({
      setItemState: jest.fn(
        () =>
          new Promise((resolve) => {
            release = resolve
          }),
      ),
    } as never)
    const day = '2026-06-10'
    const { result, rerender } = renderHook(
      ({ revision }: { revision: object }) =>
        useToggleItem('version-1', undefined, { day, revision }),
      { initialProps: { revision: {} } },
    )
    let write: Promise<boolean> = Promise.resolve(true)
    act(() => {
      write = result.current.toggle(day, 'fajr', true, false)
    })
    rerender({ revision: {} })
    expect(result.current.getOptimisticDone(day, 'fajr', false)).toBe(true)
    await act(async () => {
      release({ ok: false, error: 'failed' })
      expect(await write).toBe(false)
    })
    expect(refreshLiveRepositoryQueries).toHaveBeenCalledTimes(1)
    rerender({ revision: {} })
    expect(result.current.optimisticItems.has(`${day}:fajr`)).toBe(false)
    expect(result.current.getOptimisticDone(day, 'fajr', true)).toBe(true)
  })

  it('requests a refresh when the repository rejects a write', async () => {
    mockedUseWirdRepository.mockReturnValue({
      setItemState: jest.fn().mockRejectedValue(new Error('write failed')),
    } as never)
    const { result } = renderHook(() => useToggleItem('version-1'))
    await act(async () => {
      expect(await result.current.toggle('2026-06-10', 'fajr', true, false)).toBe(false)
    })
    expect(refreshLiveRepositoryQueries).toHaveBeenCalledTimes(1)
    expect(result.current.hasError).toBe(true)
  })
})
