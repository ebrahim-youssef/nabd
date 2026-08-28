import { OnboardingGate } from '../src/onboarding/OnboardingGate'

export default function IndexRoute() {
  return <OnboardingGate now={() => new Date()} />
}
