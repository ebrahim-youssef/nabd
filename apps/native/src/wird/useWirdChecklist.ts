import { buildChecklist, monthOf, versionInForce } from '@nabd/shared'
import type { ChecklistAreaView, DayId } from '@nabd/shared'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { captureException } from '../observability/sentry'
import { useWirdRepository } from './useWirdRepository'

type ChecklistState = {
  isLoading: boolean
  areas: ChecklistAreaView[]
  versionId: string | null
  refresh: () => void
}

export function useWirdChecklist(day: DayId): ChecklistState {
  const repository = useWirdRepository()
  const [refreshToken, setRefreshToken] = useState(0)
  const [state, setState] = useState<Omit<ChecklistState, 'refresh'>>({
    isLoading: true,
    areas: [],
    versionId: null,
  })
  const refresh = useCallback(() => {
    setState((current) => ({ ...current, isLoading: true }))
    setRefreshToken((current) => current + 1)
  }, [])

  useEffect(() => {
    let active = true
    void Promise.all([
      repository.listVersions(),
      repository.getDayEntries(day),
      repository.getMonthEntries(monthOf(day)),
    ])
      .then(([versions, entries, monthEntries]) => {
        if (!active) return
        const version = versionInForce(versions, day)
        setState(
          version
            ? {
                isLoading: false,
                areas: buildChecklist(version.definition, entries, day, monthEntries),
                versionId: version.id,
              }
            : { isLoading: false, areas: [], versionId: null },
        )
      })
      .catch((cause: unknown) => {
        captureException(cause)
        if (active) setState({ isLoading: false, areas: [], versionId: null })
      })
    return () => {
      active = false
    }
  }, [day, refreshToken, repository])

  return useMemo(() => ({ ...state, refresh }), [state, refresh])
}
