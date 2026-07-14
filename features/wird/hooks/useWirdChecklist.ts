'use client'

import { useLiveQuery } from 'dexie-react-hooks'

import type { DayId } from '@/types/wird'

import { getDayEntries, listVersions } from '../db'
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
// offline source of truth) and resolves them into the grouped view. Seeding lives in
// useSeedWird so multiple readers of this hook never race to seed.
export function useWirdChecklist(day: DayId): ChecklistState {
  const data = useLiveQuery(async () => {
    const [versions, entries] = await Promise.all([listVersions(), getDayEntries(day)])
    return { versions, entries }
  }, [day])

  if (!data) return { isLoading: true, areas: [], versionId: null }

  const version = versionInForce(data.versions, day)
  if (!version) return { isLoading: false, areas: [], versionId: null }

  return {
    isLoading: false,
    areas: buildChecklist(version.definition, data.entries),
    versionId: version.id,
  }
}
