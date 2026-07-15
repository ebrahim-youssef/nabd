'use client'

import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'

import { WIRD_LEVELS } from '@/content/levels'
import { now, today } from '@/lib/impure/clock'

import { countWirdVersions, seedWirdFromLevel } from '../db'
import { levelById } from '../logic'
import type { LevelId } from '../types'

type OnboardingState = {
  // Undetermined while Dexie loads; the gate shows a skeleton then.
  isLoading: boolean
  // True while no wird version exists — the questionnaire should be shown.
  isNeeded: boolean
  // Seeds the first wird version from the chosen level. Errors surface as `hasError`
  // (friendly message in the UI; full detail goes to the Logger inside db.ts).
  complete: (levelId: LevelId) => Promise<void>
  hasError: boolean
}

export function useOnboarding(): OnboardingState {
  const versionCount = useLiveQuery(countWirdVersions, [])
  const [hasError, setHasError] = useState(false)

  const complete = async (levelId: LevelId) => {
    const level = levelById(WIRD_LEVELS, levelId)
    if (!level) {
      setHasError(true)
      return
    }
    setHasError(false)
    const result = await seedWirdFromLevel(level.wird, today(), now())
    if (!result.ok) setHasError(true)
    // On success the live query flips isNeeded and the gate swaps to the checklist.
  }

  return {
    isLoading: versionCount === undefined,
    isNeeded: versionCount === 0,
    complete,
    hasError,
  }
}
