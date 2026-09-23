import { useRef, useState } from 'react'

import type { DayId } from '@nabd/shared'

import { logger } from '../observability/logger'
import { useWirdRepository } from './useWirdRepository'

export function useToggleItem(versionId: string | null, onRefresh?: () => void) {
  const repository = useWirdRepository()
  const pendingItems = useRef(new Set<string>())
  const [pendingItemIds, setPendingItemIds] = useState<ReadonlySet<string>>(new Set())
  const [hasError, setHasError] = useState(false)

  async function toggle(day: DayId, itemId: string, nextDone: boolean) {
    if (pendingItems.current.has(itemId)) return

    pendingItems.current.add(itemId)
    setPendingItemIds(new Set(pendingItems.current))
    setHasError(false)
    try {
      const result = versionId
        ? await repository.appendEntry(day, versionId, itemId, nextDone, Date.now())
        : { ok: false as const, error: 'version_not_found' }
      if (!result.ok) setHasError(true)
      else onRefresh?.()
    } catch (cause: unknown) {
      logger.error('Native wird item toggle failed', cause)
      setHasError(true)
    } finally {
      pendingItems.current.delete(itemId)
      setPendingItemIds(new Set(pendingItems.current))
    }
  }

  return { toggle, pendingItemIds, hasError }
}
