import { act, renderHook } from '@testing-library/react-native'

import type { DayPlanItem } from '../../day-plan/types'
import { useChecklistCallbacks } from '../useChecklistCallbacks'

it('keeps each row callback stable and uses the latest item and handler', () => {
  const firstHandler = jest.fn()
  const nextHandler = jest.fn()
  const item: DayPlanItem = {
    id: 'fajr',
    label: 'الفجر',
    done: false,
    optional: false,
    kind: 'checkbox',
  }
  const { result, rerender } = renderHook(
    ({ handler }: { handler: (item: DayPlanItem, group: string | null) => void }) =>
      useChecklistCallbacks(handler),
    { initialProps: { handler: firstHandler } },
  )
  const first = result.current(item)
  rerender({ handler: nextHandler })
  const updated = { ...item, done: true }
  const next = result.current(updated)
  expect(next).toBe(first)
  act(() => next())
  expect(firstHandler).not.toHaveBeenCalled()
  expect(nextHandler).toHaveBeenCalledWith(updated, null)
})
