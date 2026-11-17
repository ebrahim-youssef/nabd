import { useSQLiteContext } from 'expo-sqlite'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { toDayId } from '../lib/day'
import { INITIAL_FLOW, tap as tapFlow } from './logic'
import type { Dhikr } from '../content/adhkar'
import type { DayId } from '../wird/types'
import type { FlowState } from './logic'

import { createAdhkarRepository } from './db'
import { normalizeFlowState } from './logic'

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
  const hydrated = useRef(!persisted)
  const [marked, setMarked] = useState<{ key: string; value: boolean }>({
    key: flowKey,
    value: false,
  })
  const markedInWird = marked.key === flowKey && marked.value

  useEffect(() => {
    const version = hydrationVersion.current + 1
    hydrationVersion.current = version
    current.current = INITIAL_FLOW
    hydrated.current = !persisted
    if (!persisted) return
    let cancelled = false
    void (async () => {
      const saved = await repository.readFlowProgress(categoryId, day)
      if (cancelled || hydrationVersion.current !== version) return
      const normalized =
        saved && saved.categoryId === categoryId && saved.day === day
          ? normalizeFlowState(saved, items)
          : undefined
      if (normalized) {
        current.current = normalized
        setStored({ key: flowKey, flow: normalized })
        setMarked({ key: flowKey, value: normalized.finished })
        hydrated.current = true
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
      hydrated.current = true
    })()
    return () => {
      cancelled = true
    }
  }, [categoryId, day, flowKey, items, persisted, repository])

  const tap = useCallback(() => {
    if (persisted && !hydrated.current) return
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
