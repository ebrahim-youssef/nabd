import { AppIndexContent, AppIndexHeader } from '../app/AppIndex'
import { OnboardingGate } from './OnboardingGate'

export function GatedAppIndex() {
  return (
    <div className="flex flex-col gap-6">
      <AppIndexHeader />
      <OnboardingGate>
        <AppIndexContent />
      </OnboardingGate>
    </div>
  )
}
