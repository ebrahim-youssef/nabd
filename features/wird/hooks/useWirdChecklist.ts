'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef } from 'react'

import { DEFAULT_WIRD } from '@/content/default_wird'
import { now } from '@/lib/impure/clock'
import type { DayId } from '@/types/wird'

import { getDayEntries, listVersions, seedVersionIfEmpty } from '../db'
import { buildChecklist, versionInForce } from '../logic'
import type { ChecklistAreaView } from '../types'

type ChecklistState = {
  isLoading: boolean
  areas: ChecklistAreaView[]
  // The version in force on `day`; the toggle handler needs it to stamp new entries. Null while
  // loading or before any version has taken effect.
  versionId: string | null
}

// Live checklist for a day: reads versions + that day's entries from Dexie (the offline source
// of truth) and resolves them into the grouped view. Seeds a starter version the first time the
// store is empty so a brand-new user has something to check off before onboarding (NBD-6).
export function useWirdChecklist(day: DayId): ChecklistState {
  const data = useLiveQuery(async () => {
    const [versions, entries] = await Promise.all([listVersions(), getDayEntries(day)])
    return { versions, entries }
  }, [day])

  // Seed exactly once when the store is confirmed empty. The ref guards against the effect
  // firing again before the live query reflects the newly seeded version.
  const seeding = useRef(false)
  useEffect(() => {
    if (!data || seeding.current) return
    if (data.versions.length === 0) {
      seeding.current = true
      void seedVersionIfEmpty(day, DEFAULT_WIRD, now())
    }
  }, [data, day])

  if (!data) return { isLoading: true, areas: [], versionId: null }

  const version = versionInForce(data.versions, day)
  if (!version) return { isLoading: false, areas: [], versionId: null }

  return {
    isLoading: false,
    areas: buildChecklist(version.definition, data.entries),
    versionId: version.id,
  }
}
