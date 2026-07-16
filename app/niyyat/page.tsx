import type { Metadata } from 'next'

import { PageHeader } from '@/components/shared/PageHeader'
import { IntentionsLibrary } from '@/features/intentions/components/IntentionsLibrary'

export const metadata: Metadata = {
  title: 'النوايا',
  description: 'مكتبة النوايا — نيّة مستحضرة لكل عمل: الصلاة، القرآن، الذكر، الصيام، وغيرها.',
  alternates: { canonical: '/niyyat' },
}

// Public, server-rendered reference page (NBD-13): browsable without a wird or an account.
export default function NiyyatPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-10 md:px-6">
      <PageHeader title="مكتبة النوايا" backHref="/libraries" />
      <p className="text-muted-foreground text-body">
        إنما الأعمال بالنيات — افتح أيّ عمل لتستحضر نيّته قبل أن تبدأه.
      </p>

      <IntentionsLibrary />

      <p className="text-muted-foreground text-label">
        على نهج كتاب «نوايا — دليل إلى نوايا الأعمال» لطلال فاخر.
      </p>
    </main>
  )
}
