import { useLiveQuery } from 'dexie-react-hooks'

import { buildChecklist, monthOf, versionInForce } from '@nabd/shared'
import type { ChecklistAreaView, DayId } from '@nabd/shared'

import { getDayEntries, getMonthEntries, listVersions } from './db'

type ChecklistState = {
  isLoading: boolean
  areas: ChecklistAreaView[]
  versionId: string | null
}

export function useWirdChecklist(day: DayId): ChecklistState {
  const data = useLiveQuery(async () => {
    const [versions, entries, monthEntries] = await Promise.all([
      listVersions(),
      getDayEntries(day),
      getMonthEntries(monthOf(day)),
    ])
    return { versions, entries, monthEntries }
  }, [day])

  if (!data) return { isLoading: true, areas: [], versionId: null }

  const version = versionInForce(data.versions, day)
  if (!version) return { isLoading: false, areas: [], versionId: null }

  return {
    isLoading: false,
    areas: buildChecklist(version.definition, data.entries, day, data.monthEntries),
    versionId: version.id,
  }
}
