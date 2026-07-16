import type { Metadata } from 'next'
import { Suspense } from 'react'

import { PageHeader } from '@/components/shared/PageHeader'
import { AdhkarTabs } from '@/features/adhkar/components/AdhkarTabs'

export const metadata: Metadata = {
  title: 'الأذكار',
  description: 'مكتبة الأذكار — أذكار الصباح والمساء وبعد الصلاة والنوم، بنصوصها ومصادرها.',
  alternates: { canonical: '/adhkar' },
}

// The adhkar page (NBD-12, tabs + guided flow per NBD-29): one tab per category with a
// tap-to-count flow that feeds the wird, and the full reference underneath. Suspense wraps
// the client tabs because they read ?tab= via useSearchParams.
export default function AdhkarPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-10 md:px-6">
      <PageHeader title="مكتبة الأذكار" backHref="/libraries" />

      <Suspense
        fallback={
          <div className="bg-surface-2 h-60 w-full animate-pulse rounded-card" aria-hidden />
        }
      >
        <AdhkarTabs />
      </Suspense>
    </main>
  )
}
