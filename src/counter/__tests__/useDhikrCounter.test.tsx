import { act, renderHook } from '@testing-library/react-native'

import { useDhikrCounter } from '../useDhikrCounter'
import { refreshLiveRepositoryQueries } from '../../shell/useLiveRepositoryQuery'

const mockComplete = jest.fn()

jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => ({}) }))
jest.mock('../db', () => ({
  createDhikrCompletionRepository: () => ({ completeLinkedWirdItem: mockComplete }),
}))
jest.mock('../../wird/WirdDayProvider', () => ({ useWirdDay: () => ({ refresh: jest.fn() }) }))
jest.mock('../../shell/useLiveRepositoryQuery', () => ({ refreshLiveRepositoryQueries: jest.fn() }))

describe('useDhikrCounter', () => {
  beforeEach(() => jest.clearAllMocks())

  it.each([
    [{ ok: true, value: { id: 'entry' } }, 1],
    [{ ok: true, value: null }, 0],
    [{ ok: false, error: 'write failed' }, 0],
  ] as const)(
    'refreshes live queries only when counter completion inserts an entry',
    async (completion, calls) => {
      mockComplete.mockResolvedValue(completion)
      const { result } = renderHook(() =>
        useDhikrCounter('2026-09-20', 'counter-refresh-test', 1, false),
      )
      await act(async () => {
        await result.current.tap()
      })
      expect(refreshLiveRepositoryQueries).toHaveBeenCalledTimes(calls)
    },
  )
  it('retains its count when a checklist item is undone', async () => {
    const { result, rerender } = renderHook(
      ({ done }: { done: boolean }) =>
        useDhikrCounter('2026-09-20', 'counter-test-undo-item', 3, done),
      { initialProps: { done: false } },
    )

    await act(async () => result.current.tap())
    expect(result.current.count).toBe(1)

    rerender({ done: true })
    rerender({ done: false })

    expect(result.current.count).toBe(1)
  })
})
