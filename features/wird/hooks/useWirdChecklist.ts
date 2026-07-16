'use client'

import { useLiveQuery } from 'dexie-react-hooks'

import type { DayId } from '@/types/wird'

import { monthOf } from '@/lib/pure/day'

import { getDayEntries, getMonthEntries, listVersions } from '../db'
import { buildChecklist, versionInForce } from '../logic'
import type { ChecklistAreaView } from '../types'

type ChecklistState = {
  isLoading: boolean
  areas: ChecklistAreaView[]
  // The version in force on `day`; the toggle handler needs it to stamp new entries. Null while
  // loading or before any version has taken effect.
  versionId: string | null
}

// Live, read-only checklist for a day: reads versions + that day's entries from Dexie (the
// offline source of truth) and resolves them into the grouped view. The first version is
// seeded by the onboarding questionnaire (features/onboarding), never here.
export function useWirdChecklist(day: DayId): ChecklistState {
  const data = useLiveQuery(async () => {
    const [versions, entries, monthEntries] = await Promise.all([
      listVersions(),
      getDayEntries(day),
      // Month window feeds monthly-goal progress (ADR-0008).
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
