import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { INITIAL_FLOW, tap as tapFlow, toDayId } from '@nabd/shared'
import type { DayId, Dhikr, FlowState } from '@nabd/shared'

import { createAdhkarRepository } from './db'

export function useAdhkarFlow(
  categoryId: string,
  items: Dhikr[],
  day: DayId = toDayId(new Date()),
  now: () => number = Date.now,
) {
  const database = useSQLiteContext()
  const repository = useMemo(() => createAdhkarRepository(database), [database])
  const persisted = categoryId === 'morning' || categoryId === 'evening'
  const flowKey = `${day}:${categoryId}`
  const [stored, setStored] = useState<{ key: string; flow: FlowState }>({
    key: flowKey,
    flow: INITIAL_FLOW,
  })
  const state = stored.key === flowKey ? stored.flow : INITIAL_FLOW
  const current = useRef(INITIAL_FLOW)
  const hydrationVersion = useRef(0)
  const [marked, setMarked] = useState<{ key: string; value: boolean }>({
    key: flowKey,
    value: false,
  })
  const markedInWird = marked.key === flowKey && marked.value

  useEffect(() => {
    const version = hydrationVersion.current + 1
    hydrationVersion.current = version
    current.current = INITIAL_FLOW
    if (!persisted) return
    let cancelled = false
    void (async () => {
      const saved = await repository.readFlowProgress(categoryId, day)
      if (cancelled || hydrationVersion.current !== version) return
      if (saved) {
        current.current = saved
        setStored({ key: flowKey, flow: saved })
        setMarked({ key: flowKey, value: saved.finished })
        return
      }
      const linkedDone = await repository.isLinkedWirdItemDone(day, categoryId)
      if (cancelled || hydrationVersion.current !== version) return
      if (linkedDone) {
        const finished = { ...INITIAL_FLOW, finished: true }
        current.current = finished
        setStored({ key: flowKey, flow: finished })
        setMarked({ key: flowKey, value: true })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [categoryId, day, flowKey, persisted, repository])

  const tap = useCallback(() => {
    hydrationVersion.current += 1
    const next = tapFlow(current.current, items)
    if (next === current.current) return
    const finishedNow = !current.current.finished && next.finished
    current.current = next
    setStored({ key: flowKey, flow: next })
    if (persisted) void repository.writeFlowProgress(categoryId, day, next)
    if (finishedNow) {
      void repository.completeLinkedWirdItem(day, categoryId, now()).then((result) => {
        if (result.ok) setMarked({ key: flowKey, value: true })
      })
    }
  }, [categoryId, day, flowKey, items, now, persisted, repository])

  const restart = useCallback(() => {
    hydrationVersion.current += 1
    current.current = INITIAL_FLOW
    setStored({ key: flowKey, flow: INITIAL_FLOW })
    setMarked({ key: flowKey, value: false })
    if (persisted) void repository.clearFlowProgress(categoryId)
  }, [categoryId, flowKey, persisted, repository])

  return { state, tap, restart, markedInWird }
}
