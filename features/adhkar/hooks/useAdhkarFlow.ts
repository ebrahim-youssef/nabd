'use client'

import { useCallback, useState } from 'react'

import type { Dhikr } from '@/content/adhkar'
import { now, today } from '@/lib/impure/clock'

import { CATEGORY_TO_WIRD_ITEM } from '../constants'
import { completeLinkedWirdItem } from '../db'
import { INITIAL_FLOW, tap as tapPure, type FlowState } from '../logic'

// Session-scoped guided flow for one adhkar category (NBD-29). Finishing the last dhikr
// auto-marks the linked wird item (if the current wird carries one). Leaving the page resets
// the flow — the durable record is the wird entry, not the tap counts.
export function useAdhkarFlow(categoryId: string, items: Dhikr[]) {
  const [state, setState] = useState<FlowState>(INITIAL_FLOW)
  const [markedInWird, setMarkedInWird] = useState(false)

  const tap = useCallback(() => {
    setState((prev) => {
      const next = tapPure(prev, items)
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
  }, [categoryId, items])

  const restart = useCallback(() => {
    setState(INITIAL_FLOW)
    setMarkedInWird(false)
  }, [])

  return { state, tap, restart, markedInWird }
}
