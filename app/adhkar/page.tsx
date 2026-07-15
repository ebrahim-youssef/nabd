import type { Metadata } from 'next'
import Link from 'next/link'

import { AdhkarLibrary } from '@/features/adhkar/components/AdhkarLibrary'

export const metadata: Metadata = {
  title: 'الأذكار',
  description: 'مكتبة الأذكار — أذكار الصباح والمساء وبعد الصلاة والنوم، بنصوصها ومصادرها.',
  alternates: { canonical: '/adhkar' },
}

// Public, server-rendered reference page (NBD-12): browsable without a wird or an account.
export default function AdhkarPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-4 pb-10 md:gap-8 md:px-6 md:pt-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-display text-primary">الأذكار</h1>
        <p className="text-muted-foreground text-body">
          مرجعٌ مختصر لأذكار اليوم والليلة — اقرأ منه ما شئت، سواء كان في وِردك أو لم يكن.
        </p>
      </header>

      <AdhkarLibrary />

      <Link href="/" className="text-primary text-body underline-offset-4 hover:underline">
        العودة إلى الرئيسية
      </Link>
    </main>
  )
}
