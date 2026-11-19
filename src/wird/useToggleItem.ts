import { useRef, useState } from 'react'

import type { DayId } from './types'

import { logger } from '../observability/logger'
import { useWirdRepository } from './useWirdRepository'

let actionSequence = 0

function nextActionId(itemId: string): string {
  actionSequence += 1
  return `${Date.now().toString(36)}-${actionSequence.toString(36)}-${itemId}`
}

export function useToggleItem(versionId: string | null, onRefresh?: () => void) {
  const repository = useWirdRepository()
  const pendingItems = useRef(new Set<string>())
  const pendingOperations = useRef(new Map<string, Promise<boolean>>())
  const [pendingItemIds, setPendingItemIds] = useState<ReadonlySet<string>>(new Set())
  const [hasError, setHasError] = useState(false)

  async function toggle(day: DayId, itemId: string, nextDone: boolean): Promise<boolean> {
    const previousOperation = pendingOperations.current.get(itemId)

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
        if (!wasSaved) setHasError(true)
        else onRefresh?.()
        return wasSaved
      } catch (cause: unknown) {
        logger.error('Native wird item toggle failed', cause)
        setHasError(true)
        return false
      }
    })()
    pendingOperations.current.set(itemId, operation)
    const wasSaved = await operation
    if (pendingOperations.current.get(itemId) === operation) {
      pendingOperations.current.delete(itemId)
      pendingItems.current.delete(itemId)
      setPendingItemIds(new Set(pendingItems.current))
    }
    return wasSaved
  }

  return { toggle, pendingItemIds, hasError }
}
