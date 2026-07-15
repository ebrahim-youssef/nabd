import type { Metadata } from 'next'
import Link from 'next/link'

import { IntentionsLibrary } from '@/features/intentions/components/IntentionsLibrary'

export const metadata: Metadata = {
  title: 'النوايا',
  description: 'مكتبة النوايا — نيّة مستحضرة لكل عمل: الصلاة، القرآن، الذكر، الصيام، وغيرها.',
  alternates: { canonical: '/niyyat' },
}

// Public, server-rendered reference page (NBD-13): browsable without a wird or an account.
export default function NiyyatPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-4 pb-10 md:gap-8 md:px-6 md:pt-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-display text-primary">النوايا</h1>
        <p className="text-muted-foreground text-body">
          إنما الأعمال بالنيات — افتح أيّ عمل لتستحضر نيّته قبل أن تبدأه.
        </p>
      </header>

      <IntentionsLibrary />

      <Link href="/" className="text-primary text-body underline-offset-4 hover:underline">
        العودة إلى الرئيسية
      </Link>
    </main>
  )
}
