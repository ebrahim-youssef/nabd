import type { Metadata } from 'next'

import { PageHeader } from '@/components/shared/PageHeader'
import { WirdStats } from '@/features/stats/components/WirdStats'

export const metadata: Metadata = {
  title: 'الإحصائيات',
  description: 'إحصاءات وِردك — الإنجاز اليومي ولكل مجال.',
  robots: { index: false },
}

// Personal statistics on their own page (NBD-22); reached from the bottom navbar.
export default function StatsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-10 md:px-6">
      <PageHeader title="الإحصائيات" backHref="/" />
      <WirdStats />
    </main>
  )
}
