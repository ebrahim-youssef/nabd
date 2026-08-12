import { useRef, useState } from 'react'

import type { DayId } from '@nabd/shared'

import { appendEntryForDay } from './db'

export function useToggleItem() {
  const pendingItems = useRef(new Set<string>())
  const [pendingItemIds, setPendingItemIds] = useState<ReadonlySet<string>>(new Set())
  const [hasError, setHasError] = useState(false)

  async function toggle(day: DayId, itemId: string, nextDone: boolean) {
    if (pendingItems.current.has(itemId)) return

    pendingItems.current.add(itemId)
    setPendingItemIds(new Set(pendingItems.current))
    setHasError(false)
    const result = await appendEntryForDay(day, itemId, nextDone, Date.now())
    if (!result.ok) setHasError(true)
    pendingItems.current.delete(itemId)
    setPendingItemIds(new Set(pendingItems.current))
  }

  return { toggle, pendingItemIds, hasError }
}
