import { useSyncExternalStore } from 'react'

type OnboardingCompletionListener = () => void

let onboardingComplete = false
const onboardingCompletionListeners = new Set<OnboardingCompletionListener>()

export function setOnboardingComplete(value: boolean) {
  if (onboardingComplete === value) return
  onboardingComplete = value
  onboardingCompletionListeners.forEach((listener) => listener())
}

export function useOnboardingComplete(): boolean {
  return useSyncExternalStore(
    (listener) => {
      onboardingCompletionListeners.add(listener)
      return () => onboardingCompletionListeners.delete(listener)
    },
    () => onboardingComplete,
    () => false,
  )
}
