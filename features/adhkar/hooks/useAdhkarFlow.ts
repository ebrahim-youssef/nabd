'use client'

import { useCallback, useEffect, useState } from 'react'

import type { Dhikr } from '@/content/adhkar'
import { now, today } from '@/lib/impure/clock'

import { CATEGORY_TO_WIRD_ITEM, ONCE_DAILY_CATEGORIES } from '../constants'
import {
  clearFlowProgress,
  completeLinkedWirdItem,
  readFlowProgress,
  writeFlowProgress,
} from '../db'
import { INITIAL_FLOW, tap as tapPure, type FlowState } from '../logic'

// Guided flow for one adhkar category (NBD-29). Finishing the last dhikr auto-marks the
// linked wird item (if the current wird carries one). Once-daily categories (صباح/مساء)
// persist their position for the day and resume after an interruption (NBD-41); repeatable
// categories reset on every visit — their durable record is the wird entry, not tap counts.
export function useAdhkarFlow(categoryId: string, items: Dhikr[]) {
  const [state, setState] = useState<FlowState>(INITIAL_FLOW)
  const [markedInWird, setMarkedInWird] = useState(false)
  const persisted = ONCE_DAILY_CATEGORIES.has(categoryId)

  useEffect(() => {
    if (!persisted) return
    let cancelled = false
    void readFlowProgress(categoryId).then((row) => {
      if (cancelled || !row || row.day !== today()) return
      const resumed: FlowState = { index: row.index, count: row.count, finished: row.finished }
      // Apply only while untouched — a tap that raced the read wins over the stored position.
      setState((prev) => (prev === INITIAL_FLOW ? resumed : prev))
      // A finished flow already marked its wird item when it finished.
      if (row.finished) setMarkedInWird(true)
    })
    return () => {
      cancelled = true
    }
  }, [categoryId, persisted])

  const tap = useCallback(() => {
    setState((prev) => {
      const next = tapPure(prev, items)
      if (next === prev) return prev
      if (persisted) void writeFlowProgress(categoryId, today(), next)
      if (!prev.finished && next.finished) {
        const linkedItem = CATEGORY_TO_WIRD_ITEM[categoryId]
        if (linkedItem) {
          void completeLinkedWirdItem(today(), linkedItem, now()).then((result) => {
            if (result.ok && result.value) setMarkedInWird(true)
          })
        }
      }
      return next
    })
  }, [categoryId, items, persisted])

  const restart = useCallback(() => {
    setState(INITIAL_FLOW)
    setMarkedInWird(false)
    if (persisted) void clearFlowProgress(categoryId)
  }, [categoryId, persisted])

  return { state, tap, restart, markedInWird }
}
