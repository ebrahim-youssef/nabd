import { shellCopy } from '@nabd/shared'

import { CompletionCelebration } from '../wird/CompletionCelebration'
import { TodaySummary } from '../wird/TodaySummary'
import { WirdChecklist } from '../wird/WirdChecklist'
import { ThemeToggle } from './ThemeToggle'

// The header stays outside the onboarding gate and the content inside it, so a new user sees the
// app identity and theme control while answering the questionnaire. `GatedAppIndex` composes them.
export function AppIndexHeader() {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-display text-display text-primary">{shellCopy.appName}</h1>
        <ThemeToggle />
      </div>
    </header>
  )
}

export function AppIndexContent() {
  return (
    <div className="flex flex-col gap-6">
      <TodaySummary />
      <WirdChecklist />
      <CompletionCelebration />
    </div>
  )
}
