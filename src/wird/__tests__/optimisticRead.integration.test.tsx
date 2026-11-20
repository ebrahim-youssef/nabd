import { act, renderHook, waitFor } from '@testing-library/react-native'

import { useLiveRepositoryQuery } from '../../shell/useLiveRepositoryQuery'
import { useWirdRepository } from '../useWirdRepository'
import { useToggleItem } from '../useToggleItem'

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }))
jest.mock('../useWirdRepository')

it('keeps an optimistic write when an older read resolves and clears it after a newer read', async () => {
  jest.useFakeTimers()
  let resolveOld: (value: boolean) => void = () => undefined
  const read = jest
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          resolveOld = resolve
        }),
    )
    .mockResolvedValue(false)
  jest.mocked(useWirdRepository).mockReturnValue({
    setItemState: jest
      .fn()
      .mockResolvedValue({ ok: true, value: { outcome: 'applied', entry: null } }),
  } as never)
  const { result, unmount } = renderHook(() => {
    const query = useLiveRepositoryQuery(read)
    const toggle = useToggleItem('version', undefined, {
      day: '2026-10-18',
      revision: query.readSequence,
    })
    return { query, toggle }
  })
  try {
    await act(async () => {
      await Promise.resolve()
    })
    expect(read).toHaveBeenCalledTimes(1)
    await act(async () => {
      await result.current.toggle.toggle('2026-10-18', 'fajr', true, false)
    })
    await act(async () => {
      resolveOld(false)
      await Promise.resolve()
    })
    expect(result.current.query.data).toBe(false)
    expect(result.current.toggle.getOptimisticDone('2026-10-18', 'fajr', false)).toBe(true)
    expect(!result.current.toggle.getOptimisticDone('2026-10-18', 'fajr', false)).toBe(false)
    await act(async () => {
      jest.runOnlyPendingTimers()
      await Promise.resolve()
    })
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2))
    await waitFor(() =>
      expect(result.current.toggle.optimisticItems.has('2026-10-18:fajr')).toBe(false),
    )
    expect(result.current.toggle.getOptimisticDone('2026-10-18', 'fajr', false)).toBe(false)
    expect(!result.current.toggle.getOptimisticDone('2026-10-18', 'fajr', false)).toBe(true)
  } finally {
    unmount()
    await act(async () => {
      jest.runOnlyPendingTimers()
      await Promise.resolve()
    })
    jest.useRealTimers()
  }
})
