import { ChevronLeft, RotateCcw } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

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

      {/* المحاسبة door to the qada ledger (NBD-39). */}
      <Link
        href="/qada"
        data-testid="qada-link"
        className="border-border bg-surface shadow-card-sm hover:border-accent/40 hover:shadow-card group flex items-center gap-4 rounded-card border p-4 transition-all"
      >
        <span
          aria-hidden
          className="bg-primary/10 text-primary group-hover:bg-primary group-hover:text-on-primary flex size-12 shrink-0 items-center justify-center rounded-icon transition-colors"
        >
          <RotateCcw className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-display text-title text-primary">قضاء الفوائت</span>
          <span className="text-muted-foreground text-small">
            قدّر ما فاتك من الصلوات واقضِه صلاةً صلاة.
          </span>
        </span>
        <ChevronLeft aria-hidden className="text-muted-foreground size-5 shrink-0" />
      </Link>
    </main>
  )
}
