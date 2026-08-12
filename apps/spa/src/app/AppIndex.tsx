import { shellCopy } from '@nabd/shared'

import { ThemeToggle } from './ThemeToggle'

// Bounded transitional content for the application shell while the daily wird arrives in slice 2.
const INDEX_NOTE = 'واجهة الورد اليومي تُبنى الآن في هذا المسار، وتصل كاملة في الترقية التالية.'
const INDEX_NAV_HINT =
  'جرّب شاشات «المكتبات» و«المواقيت» و«الإحصائيات» و«الإعدادات» من شريط التنقل السفلي، وهي أماكن مؤقتة لتثبيت هيكل التطبيق.'

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
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card-small">
      <p className="m-0 text-body text-foreground">{INDEX_NOTE}</p>
      <p className="m-0 text-small text-muted-foreground">{INDEX_NAV_HINT}</p>
    </div>
  )
}
