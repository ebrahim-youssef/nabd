import { shellCopy } from '@nabd/shared'

import { ThemeToggle } from './ThemeToggle'

// Bounded transitional index for the application shell (NBD-83): a placeholder home that
// proves routing, navigation, theming, and loading work under /app/*. It is deliberately
// NOT a product screen — the daily wird and its features arrive with NBD-84.
const INDEX_NOTE = 'واجهة الورد اليومي تُبنى الآن في هذا المسار، وتصل كاملة في الترقية التالية.'
const INDEX_NAV_HINT =
  'جرّب شاشات «المكتبات» و«المواقيت» و«الإحصائيات» و«الإعدادات» من شريط التنقل السفلي، وهي أماكن مؤقتة لتثبيت هيكل التطبيق.'

export function AppIndex() {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-display text-display text-primary">{shellCopy.appName}</h1>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card-sm">
        <p className="m-0 text-body text-foreground">{INDEX_NOTE}</p>
        <p className="m-0 text-small text-muted-foreground">{INDEX_NAV_HINT}</p>
      </div>
    </div>
  )
}
