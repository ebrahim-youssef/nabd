import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHeader } from '@/components/shared/PageHeader'

export const metadata: Metadata = {
  title: 'المكتبات',
  description: 'مكتبات نبض — الأذكار والنوايا.',
  alternates: { canonical: '/libraries' },
}

const LIBRARIES = [
  {
    href: '/adhkar',
    title: 'مكتبة الأذكار',
    description: 'أذكار الصباح والمساء وبعد الصلاة والنوم، بنصوصها ومصادرها.',
  },
  {
    href: '/niyyat',
    title: 'مكتبة النوايا',
    description: 'نيّة مستحضرة لكل عمل — إنما الأعمال بالنيات.',
  },
]

// Libraries hub (NBD-22): the المكتبات tab lands here; each library is one tap away.
export default function LibrariesPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-10 md:px-6">
      <PageHeader title="المكتبات" backHref="/" />
      <ul className="flex flex-col gap-3" data-testid="libraries-hub">
        {LIBRARIES.map((library) => (
          <li key={library.href}>
            <Link
              href={library.href}
              className="bg-surface-2 hover:bg-surface-2/70 flex flex-col gap-1 rounded-card p-4 transition-colors"
            >
              <span className="font-display text-title text-primary">{library.title}</span>
              <span className="text-muted-foreground text-body">{library.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
