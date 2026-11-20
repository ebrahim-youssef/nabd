import { useEffect, useRef, useState } from 'react'

import type { DayId } from './types'

import { logger } from '../observability/logger'
import { refreshLiveRepositoryQueries } from '../shell/useLiveRepositoryQuery'
import { useWirdRepository } from './useWirdRepository'
import type { DayPlan } from '../day-plan/types'

type OptimisticItem = { done: boolean; committed: boolean; pending: number }

let actionSequence = 0

function nextActionId(itemId: string): string {
  actionSequence += 1
  return `${Date.now().toString(36)}-${actionSequence.toString(36)}-${itemId}`
}

export function useToggleItem(
  versionId: string | null,
  onRefresh?: () => void,
  observed?: { day: DayId; plan: DayPlan },
) {
  const repository = useWirdRepository()
  const pendingItems = useRef(new Set<string>())
  const pendingOperations = useRef(new Map<string, Promise<boolean>>())
  const [pendingItemIds, setPendingItemIds] = useState<ReadonlySet<string>>(new Set())
  const [hasError, setHasError] = useState(false)
  const optimisticRef = useRef(new Map<string, OptimisticItem>())
  const [optimisticItems, setOptimisticItems] = useState<ReadonlyMap<string, OptimisticItem>>(
    new Map(),
  )

  useEffect(() => {
    if (!observed) return
    const { plan, day } = observed
    const items = [
      ...plan.blocks.flatMap((block) => block.items),
      ...plan.timedActs.flatMap((act) => act.items),
      ...plan.anyTime,
      ...plan.monthly.map(({ item }) => item),
    ]
    let changed = false
    for (const item of items) {
      const key = `${day}:${item.id}`
      const optimistic = optimisticRef.current.get(key)
      if (optimistic && optimistic.pending === 0 && optimistic.done === item.done) {
        optimisticRef.current.delete(key)
        changed = true
      }
    }
    if (changed) setOptimisticItems(new Map(optimisticRef.current))
  }, [observed])

  async function toggle(
    day: DayId,
    itemId: string,
    nextDone: boolean,
    previousDone = !nextDone,
  ): Promise<boolean> {
    const key = `${day}:${itemId}`
    const previousOperation = pendingOperations.current.get(key)
    const current = optimisticRef.current.get(key)
    const optimistic = current ?? { done: previousDone, committed: previousDone, pending: 0 }
    optimistic.done = nextDone
    optimistic.pending += 1
    optimisticRef.current.set(key, optimistic)
    setOptimisticItems(new Map(optimisticRef.current))

    pendingItems.current.add(itemId)
    setPendingItemIds(new Set(pendingItems.current))
    const operation = (async () => {
      if (previousOperation) await previousOperation
      setHasError(false)
      try {
        const result = versionId
          ? await repository.setItemState({
              actionId: nextActionId(itemId),
              day,
              versionId,
              itemId,
              done: nextDone,
              at: Date.now(),
            })
          : { ok: false as const, error: 'version_not_found' }
        const wasSaved = result.ok && result.value.outcome !== 'stale'
        if (result.ok && result.value.outcome === 'applied') refreshLiveRepositoryQueries()
        if (!wasSaved) setHasError(true)
        else onRefresh?.()
        return wasSaved
      } catch (cause: unknown) {
        logger.error('Native wird item toggle failed', cause)
        setHasError(true)
        return false
      }
    })()
    pendingOperations.current.set(key, operation)
    const wasSaved = await operation
    optimistic.pending -= 1
    if (wasSaved) optimistic.committed = nextDone
    if (optimistic.pending === 0 && !wasSaved) optimistic.done = optimistic.committed
    setOptimisticItems(new Map(optimisticRef.current))
    if (pendingOperations.current.get(key) === operation) {
      pendingOperations.current.delete(key)
      pendingItems.current.delete(itemId)
      setPendingItemIds(new Set(pendingItems.current))
    }
    return wasSaved
  }

  const getOptimisticDone = (day: DayId, itemId: string, fallback: boolean) =>
    optimisticRef.current.get(`${day}:${itemId}`)?.done ?? fallback
  return { toggle, pendingItemIds, hasError, optimisticItems, getOptimisticDone }
}
