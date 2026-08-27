import type { ReactNode } from 'react'

import { shellCopy } from '@nabd/shared'

import { OnboardingQuestionnaire } from './OnboardingQuestionnaire'
import { useOnboarding } from './useOnboarding'

export function OnboardingGate({ children }: { children: ReactNode }) {
  const { isLoading, isNeeded } = useOnboarding()

  if (isLoading) {
    return (
      <div
        className="h-40 w-full animate-pulse rounded-card bg-surface2"
        aria-label={shellCopy.loading}
        role="status"
        data-testid="onboarding-loading"
      />
    )
  }

  if (isNeeded) return <OnboardingQuestionnaire />
  return children
}
