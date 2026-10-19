import { monthOf, toDayId } from '../lib/day'
import { buildChecklist, versionInForce } from './logic'
import type { ChecklistAreaView, DayId } from './types'
import { useCallback, useMemo, useRef } from 'react'

import { logger } from '../observability/logger'
import { useLiveRepositoryQuery } from '../shell/useLiveRepositoryQuery'
import type { HealVersionResult } from './db'
import { useWirdRepository } from './useWirdRepository'

type ChecklistState = {
  isLoading: boolean
  areas: ChecklistAreaView[]
  versionId: string | null
  refresh: () => void
}

export function useWirdChecklist(day: DayId): ChecklistState {
  const repository = useWirdRepository()
  const today = toDayId(new Date())
  const healingByDay = useRef(new Map<DayId, Promise<HealVersionResult | null>>())
  const ensureHealed = useCallback(() => {
    const existing = healingByDay.current.get(today)
    if (existing) return existing

    const healing = repository
      .healVersionFromLevels({
        today,
      })
      .catch((cause: unknown) => {
        logger.error('Native wird version healing failed', cause, { day })
        healingByDay.current.delete(today)
        return null
      })
    healingByDay.current.set(today, healing)
    return healing
  }, [day, repository, today])
  const read = useCallback(async () => {
    await ensureHealed()
    const [versions, entries, monthEntries] = await Promise.all([
      repository.listVersions(),
      repository.getDayEntries(day),
      repository.getMonthEntries(monthOf(day)),
    ])
    return { entries, monthEntries, versions }
  }, [day, ensureHealed, repository])
  const { data, isLoading, refresh } = useLiveRepositoryQuery(read)

  return useMemo(() => {
    if (!data) return { isLoading, areas: [], versionId: null, refresh }
    const version = versionInForce(data.versions, day)
    return version
      ? {
          isLoading,
          areas: buildChecklist(version.definition, data.entries, day, data.monthEntries),
          versionId: version.id,
          refresh,
        }
      : { isLoading, areas: [], versionId: null, refresh }
  }, [data, day, isLoading, refresh])
}
