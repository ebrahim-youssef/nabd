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
          <AuthStatus />
        </div>
        <p className="text-muted-foreground text-body">
          رفيقك اليوميّ للوِرد — صلاة وأذكار ونيّات ومحاسبة.
        </p>
      </header>

      <p className="font-scripture text-scripture text-foreground">
        ﴿ إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا ﴾
      </p>

      <OnboardingGate>
        <TodaySummary />
        <WirdChecklist />
        <CompletionCelebration />
      </OnboardingGate>
    </main>
  )
}
