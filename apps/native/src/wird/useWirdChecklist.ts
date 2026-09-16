import { buildChecklist, monthOf, versionInForce } from '@nabd/shared'
import type { ChecklistAreaView, DayId } from '@nabd/shared'
import { useCallback, useMemo } from 'react'

import { useLiveRepositoryQuery } from '../app/useLiveRepositoryQuery'
import { useWirdRepository } from './useWirdRepository'

type ChecklistState = {
  isLoading: boolean
  areas: ChecklistAreaView[]
  versionId: string | null
  refresh: () => void
}

export function useWirdChecklist(day: DayId): ChecklistState {
  const repository = useWirdRepository()
  const read = useCallback(
    () =>
      Promise.all([
        repository.listVersions(),
        repository.getDayEntries(day),
        repository.getMonthEntries(monthOf(day)),
      ]),
    [day, repository],
  )
  const { data, isLoading, refresh } = useLiveRepositoryQuery(read)

  return useMemo(() => {
    if (!data) return { isLoading, areas: [], versionId: null, refresh }
    const [versions, entries, monthEntries] = data
    const version = versionInForce(versions, day)
    return version
      ? {
          isLoading,
          areas: buildChecklist(version.definition, entries, day, monthEntries),
          versionId: version.id,
          refresh,
        }
      : { isLoading, areas: [], versionId: null, refresh }
  }, [data, day, isLoading, refresh])
}
