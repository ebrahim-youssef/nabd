import { useEffect, useRef, useState } from 'react'

import {
  CATEGORY_TO_WIRD_ITEM,
  INITIAL_FLOW,
  ONCE_DAILY_CATEGORIES,
  tap as tapFlow,
} from '@nabd/shared'
import type { DayId, Dhikr, FlowState } from '@nabd/shared'

import {
  clearFlowProgress,
  completeLinkedWirdItem,
  isLinkedWirdItemDone,
  readFlowProgress,
  writeFlowProgress,
} from './db'

const sessionFlows = new Map<string, FlowState>()

export function useAdhkarFlow(categoryId: string, items: Dhikr[], day: DayId) {
  const persisted = ONCE_DAILY_CATEGORIES.has(categoryId)
  const sessionKey = `${day}:${categoryId}`
  const [state, setState] = useState(() => sessionFlows.get(sessionKey) ?? INITIAL_FLOW)
  const [markedInWird, setMarkedInWird] = useState(false)
  const current = useRef(state)
  const hydrated = useRef(sessionFlows.has(sessionKey))

  function write(next: FlowState) {
    current.current = next
    sessionFlows.set(sessionKey, next)
    setState(next)
    if (persisted) void writeFlowProgress(categoryId, day, next)
  }

  useEffect(() => {
    if (!persisted || hydrated.current) return
    let cancelled = false
    void (async () => {
      const saved = await readFlowProgress(categoryId, day)
      if (cancelled || hydrated.current) return
      if (saved) {
        hydrated.current = true
        current.current = saved
        sessionFlows.set(sessionKey, saved)
        setState(saved)
        if (saved.finished) setMarkedInWird(true)
        return
      }

      const done = await isLinkedWirdItemDone(day, categoryId)
      if (cancelled || !done || hydrated.current) return
      const finished = { ...INITIAL_FLOW, finished: true }
      hydrated.current = true
      current.current = finished
      sessionFlows.set(sessionKey, finished)
      setState(finished)
    })()
    return () => {
      cancelled = true
    }
  }, [categoryId, day, persisted, sessionKey])

  function tap() {
    // A user interaction wins over an outstanding IndexedDB read.
    hydrated.current = true
    const next = tapFlow(current.current, items)
    if (next === current.current) return
    const finishedNow = !current.current.finished && next.finished
    write(next)
    if (finishedNow && CATEGORY_TO_WIRD_ITEM[categoryId]) {
      void completeLinkedWirdItem(day, categoryId, Date.now()).then((result) => {
        if (result.ok && result.value) setMarkedInWird(true)
      })
    }
  }

  function restart() {
    current.current = INITIAL_FLOW
    sessionFlows.set(sessionKey, INITIAL_FLOW)
    setState(INITIAL_FLOW)
    setMarkedInWird(false)
    if (persisted) void clearFlowProgress(categoryId)
  }

  return { state, tap, restart, markedInWird }
}
