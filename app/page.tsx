import { Settings } from 'lucide-react'
import Link from 'next/link'

import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { AuthStatus } from '@/features/auth/components/AuthStatus'
import { OnboardingGate } from '@/features/onboarding/components/OnboardingGate'
import { CompletionCelebration } from '@/features/wird/components/CompletionCelebration'
import { TodaySummary } from '@/features/wird/components/TodaySummary'
import { WirdChecklist } from '@/features/wird/components/WirdChecklist'

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-4 pb-10 md:gap-8 md:px-6 md:pt-8">
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-display text-primary">نبض</h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/settings"
              aria-label="الإعدادات"
              data-testid="settings-link"
              className="border-border bg-surface text-primary shadow-card-sm hover:bg-primary hover:text-on-primary flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors"
            >
              <Settings className="size-5" aria-hidden />
            </Link>
            <AuthStatus />
          </div>
        </div>
        <p className="text-muted-foreground text-body">
          رفيقك اليوميّ للوِرد — صلاة وأذكار ونيّات ومحاسبة.
        </p>
      </header>

      <div className="flex flex-col items-center gap-3 text-center">
        <p className="font-scripture text-scripture text-foreground">
          ﴿ إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا ﴾
        </p>
        <span aria-hidden className="text-gold flex w-full items-center gap-3 text-small">
          <span className="bg-border h-px flex-1" />
          ۞
          <span className="bg-border h-px flex-1" />
        </span>
      </div>

      <OnboardingGate>
        <TodaySummary />
        <WirdChecklist />
        <CompletionCelebration />
      </OnboardingGate>
    </main>
  )
}
