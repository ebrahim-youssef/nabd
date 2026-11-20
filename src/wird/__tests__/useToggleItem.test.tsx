import { act, renderHook } from '@testing-library/react-native'

import { useWirdRepository } from '../useWirdRepository'
import { useToggleItem } from '../useToggleItem'
import { refreshLiveRepositoryQueries } from '../../shell/useLiveRepositoryQuery'

jest.mock('../useWirdRepository')
jest.mock('../../shell/useLiveRepositoryQuery', () => ({ refreshLiveRepositoryQueries: jest.fn() }))

const mockedUseWirdRepository = useWirdRepository as jest.MockedFunction<typeof useWirdRepository>

describe('useToggleItem', () => {
  beforeEach(() => jest.clearAllMocks())

  it('refreshes live queries only for applied writes, including undo', async () => {
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
      expect(refreshLiveRepositoryQueries).toHaveBeenCalledTimes(Math.min(index + 1, 2))
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

  it('reports a stale write as unsuccessful and does not refresh', async () => {
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
  })

  it('queues an undo behind an in-flight tick for the same item', async () => {
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
    expect(setItemState).toHaveBeenCalledTimes(1)

    await act(async () => {
      releaseFirstWrite()
      await Promise.all([tick, undo])
    })

    expect(setItemState).toHaveBeenCalledTimes(2)
    expect(setItemState.mock.calls.map(([input]) => input.done)).toEqual([true, false])
    expect(setItemState.mock.calls[0][0].actionId).not.toBe(setItemState.mock.calls[1][0].actionId)
  })
})
