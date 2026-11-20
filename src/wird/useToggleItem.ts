import { useLayoutEffect, useRef, useState } from 'react'

import type { DayId } from './types'

import { logger } from '../observability/logger'
import {
  getLiveRepositoryReadSequence,
  refreshLiveRepositoryQueries,
} from '../shell/useLiveRepositoryQuery'
import { useWirdRepository } from './useWirdRepository'

type OptimisticItem = {
  done: boolean
  committed: boolean
  pending: number
  settledReadSequence: number
}

let actionSequence = 0

function nextActionId(itemId: string): string {
  actionSequence += 1
  return `${Date.now().toString(36)}-${actionSequence.toString(36)}-${itemId}`
}

export function useToggleItem(
  versionId: string | null,
  onRefresh?: () => void,
  observed?: { day: DayId; revision: number | undefined },
) {
  const repository = useWirdRepository()
  const pendingItems = useRef(new Set<string>())
  const [pendingItemIds, setPendingItemIds] = useState<ReadonlySet<string>>(new Set())
  const [hasError, setHasError] = useState(false)
  const optimisticRef = useRef(new Map<string, OptimisticItem>())
  const [optimisticItems, setOptimisticItems] = useState<ReadonlyMap<string, OptimisticItem>>(
    new Map(),
  )

  const observedDay = observed?.day
  const observedRevision = observed?.revision
  useLayoutEffect(() => {
    if (!observedDay || observedRevision === undefined) return
    let changed = false
    for (const [key, optimistic] of optimisticRef.current) {
      if (
        key.startsWith(`${observedDay}:`) &&
        optimistic.pending === 0 &&
        observedRevision > optimistic.settledReadSequence
      ) {
        optimisticRef.current.delete(key)
        changed = true
      }
    }
    if (changed) setOptimisticItems(new Map(optimisticRef.current))
  }, [observedDay, observedRevision])

  async function toggle(
    day: DayId,
    itemId: string,
    nextDone: boolean,
    previousDone = !nextDone,
  ): Promise<boolean> {
    const key = `${day}:${itemId}`
    const current = optimisticRef.current.get(key)
    const optimistic = current ?? {
      done: previousDone,
      committed: previousDone,
      pending: 0,
      settledReadSequence: 0,
    }
    optimistic.done = nextDone
    optimistic.pending += 1
    optimisticRef.current.set(key, optimistic)
    setOptimisticItems(new Map(optimisticRef.current))

    pendingItems.current.add(itemId)
    setPendingItemIds(new Set(pendingItems.current))
    const operation = (async () => {
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
        if (!wasSaved || (result.ok && result.value.outcome === 'applied'))
          refreshLiveRepositoryQueries()
        if (!wasSaved) setHasError(true)
        else onRefresh?.()
        return wasSaved
      } catch (cause: unknown) {
        logger.error('Native wird item toggle failed', cause)
        refreshLiveRepositoryQueries()
        setHasError(true)
        return false
      }
    })()
    const wasSaved = await operation
    optimistic.pending -= 1
    optimistic.settledReadSequence = getLiveRepositoryReadSequence()
    if (wasSaved) optimistic.committed = nextDone
    if (optimistic.pending === 0 && !wasSaved) optimistic.done = optimistic.committed
    setOptimisticItems(new Map(optimisticRef.current))
    if (optimistic.pending === 0) {
      pendingItems.current.delete(itemId)
      setPendingItemIds(new Set(pendingItems.current))
    }
    return wasSaved
  }

  const getOptimisticDone = (day: DayId, itemId: string, fallback: boolean) =>
    optimisticRef.current.get(`${day}:${itemId}`)?.done ?? fallback
  return { toggle, pendingItemIds, hasError, optimisticItems, getOptimisticDone }
}
