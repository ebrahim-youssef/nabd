'use client'

import { useOnboarding } from '../hooks/useOnboarding'
import { OnboardingQuestionnaire } from './OnboardingQuestionnaire'

// Gates the daily-wird UI behind onboarding: while no wird version exists the questionnaire
// renders instead of the children (checklist, summary, stats). Seeding a version flips the
// live query and the app appears — no navigation involved.
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isNeeded } = useOnboarding()

  if (isLoading) {
    return <div className="bg-surface-2 h-40 w-full animate-pulse rounded-card" aria-hidden />
  }

  if (isNeeded) {
    return <OnboardingQuestionnaire />
  }

  return <>{children}</>
}
