import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'

import { levelById, toDayId, WIRD_LEVELS } from '@nabd/shared'
import type { LevelId } from '@nabd/shared'

import { countWirdVersions, seedWirdFromLevel } from './db'

type OnboardingState = {
  isLoading: boolean
  isNeeded: boolean
  isSubmitting: boolean
  hasError: boolean
  complete: (levelId: LevelId) => Promise<void>
}

export function useOnboarding(): OnboardingState {
  const versionCount = useLiveQuery(countWirdVersions, [])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasError, setHasError] = useState(false)

  async function complete(levelId: LevelId) {
    if (isSubmitting) return

    const level = levelById(WIRD_LEVELS, levelId)
    if (!level) {
      setHasError(true)
      return
    }

    setHasError(false)
    setIsSubmitting(true)
    const currentTime = new Date()
    const result = await seedWirdFromLevel(level.wird, toDayId(currentTime), currentTime.getTime())
    if (!result.ok) setHasError(true)
    setIsSubmitting(false)
  }

  return {
    isLoading: versionCount === undefined,
    isNeeded: versionCount === 0,
    isSubmitting,
    hasError,
    complete,
  }
}
