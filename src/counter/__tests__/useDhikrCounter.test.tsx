import { act, renderHook } from '@testing-library/react-native'

import { useDhikrCounter } from '../useDhikrCounter'

jest.mock('expo-sqlite', () => ({ useSQLiteContext: () => ({}) }))
jest.mock('../db', () => ({
  createDhikrCompletionRepository: () => ({ completeLinkedWirdItem: jest.fn() }),
}))
jest.mock('../../wird/WirdDayProvider', () => ({ useWirdDay: () => ({ refresh: jest.fn() }) }))

describe('useDhikrCounter', () => {
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
