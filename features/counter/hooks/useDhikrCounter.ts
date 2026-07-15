'use client'

import { useCallback } from 'react'

import { now } from '@/lib/impure/clock'
import { useCounterStore } from '@/stores/counter'
import type { DayId } from '@/types/wird'

import { completeDhikr } from '../db'

// Drives one dhikr counter: each tap bumps the session count; the tap that reaches `target`
// marks the linked wird item complete (NBD-9) and clears the session. Once the item is done,
// taps are ignored.
export function useDhikrCounter(
  day: DayId,
  versionId: string,
  itemId: string,
  target: number,
  done: boolean,
) {
  const count = useCounterStore((state) => state.counts[itemId] ?? 0)
  const increment = useCounterStore((state) => state.increment)
  const reset = useCounterStore((state) => state.reset)

  const tap = useCallback(async () => {
    if (done) return
    if (count + 1 >= target) {
      await completeDhikr(day, versionId, itemId, now())
      reset(itemId)
    } else {
      increment(itemId)
    }
  }, [count, done, target, day, versionId, itemId, increment, reset])

  return { count, tap }
}
