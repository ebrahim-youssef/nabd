import type { Metadata } from 'next'

import { PageHeader } from '@/components/shared/PageHeader'
import { AdhkarLibrary } from '@/features/adhkar/components/AdhkarLibrary'

export const metadata: Metadata = {
  title: 'الأذكار',
  description: 'مكتبة الأذكار — أذكار الصباح والمساء وبعد الصلاة والنوم، بنصوصها ومصادرها.',
  alternates: { canonical: '/adhkar' },
}

// Public, server-rendered reference page (NBD-12): browsable without a wird or an account.
export default function AdhkarPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-10 md:px-6">
      <PageHeader title="مكتبة الأذكار" backHref="/libraries" />
      <p className="text-muted-foreground text-body">
        مرجعٌ مختصر لأذكار اليوم والليلة — اقرأ منه ما شئت، سواء كان في وِردك أو لم يكن.
      </p>

      <AdhkarLibrary />
    </main>
  )
}
