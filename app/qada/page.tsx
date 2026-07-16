import type { Metadata } from 'next'

import { PageHeader } from '@/components/shared/PageHeader'
import { QadaLedger } from '@/features/qada/components/QadaLedger'

export const metadata: Metadata = {
  title: 'قضاء الفوائت',
  description: 'سجلّ قضاء الفوائت — قدّر ما فاتك من الصلوات واقضِها صلاةً صلاة.',
  alternates: { canonical: '/qada' },
}

// The قضاء الفوائت ledger page (NBD-39, ADR-0010). Local-first like everything else; reached
// from the stats page (المحاسبة context) or directly.
export default function QadaPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-10 md:px-6">
      <PageHeader title="قضاء الفوائت" backHref="/stats" />
      <QadaLedger />
    </main>
  )
}
