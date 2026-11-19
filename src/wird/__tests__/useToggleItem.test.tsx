import { act, renderHook } from '@testing-library/react-native'

import { useWirdRepository } from '../useWirdRepository'
import { useToggleItem } from '../useToggleItem'

jest.mock('../useWirdRepository')

const mockedUseWirdRepository = useWirdRepository as jest.MockedFunction<typeof useWirdRepository>

describe('useToggleItem', () => {
  it('writes a state change with an action id', async () => {
    const setItemState = jest.fn().mockResolvedValue({
      ok: true,
      value: { outcome: 'applied', entry: null },
    })
    mockedUseWirdRepository.mockReturnValue({ setItemState } as never)
    const { result } = renderHook(() => useToggleItem('version-1'))

    await act(async () => {
      await result.current.toggle('2026-06-10', 'fajr', true)
    })

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
    let tick = Promise.resolve()
    let undo = Promise.resolve()

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
