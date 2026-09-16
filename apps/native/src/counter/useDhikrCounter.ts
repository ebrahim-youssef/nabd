import { useSQLiteContext } from 'expo-sqlite'
import { useMemo, useRef, useState } from 'react'

import type { DayId } from '@nabd/shared'

import { createDhikrCompletionRepository } from './db'
import { useWirdDay } from '../wird/WirdDayProvider'

// The in-progress tap count is ephemeral session state, not database state, so it does not belong
// in SQLite. It does have to outlive a remount: tapping part-way through a dhikr, visiting another
// tab and coming back must preserve the count. A module-scoped map gives the same behavior without
// adding a store dependency, and it is seeded back into component state on mount.
const sessionCounts = new Map<string, number>()

export function useDhikrCounter(day: DayId, itemId: string, target: number, done: boolean) {
  const database = useSQLiteContext()
  const repository = useMemo(() => createDhikrCompletionRepository(database), [database])
  const { refresh } = useWirdDay()
  const [count, setCount] = useState(() => sessionCounts.get(itemId) ?? 0)
  const completing = useRef(false)

  // The count is held in a ref as well as state because tapping is fast and repeated: reading the
  // `count` closure would hand every tap in the same batch the same stale value, dropping taps and
  // delaying the completion. The ref is the authoritative value; state exists to render it.
  const current = useRef(count)

  function write(next: number) {
    current.current = next
    sessionCounts.set(itemId, next)
    setCount(next)
  }

  async function tap() {
    if (done || completing.current) return

    const next = current.current + 1
    if (next < target) {
      write(next)
      return
    }

    completing.current = true
    const result = await repository.completeLinkedWirdItem(day, itemId, Date.now())
    if (result.ok) {
      write(0)
      refresh()
    }
    completing.current = false
  }

  return { count, tap }
}
