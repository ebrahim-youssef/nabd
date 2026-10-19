import { useSQLiteContext } from 'expo-sqlite'
import { useEffect, useSyncExternalStore } from 'react'

import { logger } from '../observability/logger'
import { createOnboardingRepository } from './db'

type OnboardingCompletionListener = () => void

let onboardingComplete = false
let onboardingCompletionRevision = 0
const onboardingCompletionListeners = new Set<OnboardingCompletionListener>()

export function setOnboardingComplete(value: boolean) {
  onboardingCompletionRevision += 1
  if (onboardingComplete === value) return
  onboardingComplete = value
  onboardingCompletionListeners.forEach((listener) => listener())
}

export function useOnboardingComplete(): boolean {
  const database = useSQLiteContext()

  useEffect(() => {
    const revisionAtStart = onboardingCompletionRevision
    let active = true

    void createOnboardingRepository(database)
      .load()
      .then((persisted) => {
        if (active && onboardingCompletionRevision === revisionAtStart) {
          setOnboardingComplete(Boolean(persisted))
        }
      })
      .catch((cause: unknown) => {
        if (active) logger.error('Native onboarding completion load failed', cause)
      })

    return () => {
      active = false
    }
  }, [database])

  return useSyncExternalStore(
    (listener) => {
      onboardingCompletionListeners.add(listener)
      return () => onboardingCompletionListeners.delete(listener)
    },
    () => onboardingComplete,
    () => false,
  )
}
