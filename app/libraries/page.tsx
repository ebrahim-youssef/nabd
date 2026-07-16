import { ChevronLeft, HeartHandshake, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHeader } from '@/components/shared/PageHeader'
import { ADHKAR_LIBRARY } from '@/content/adhkar'
import { INTENTIONS_LIBRARY } from '@/content/intentions'
import { toArabicIndic } from '@/lib/pure/format'

export const metadata: Metadata = {
  title: 'المكتبات',
  description: 'مكتبات نبض — الأذكار والنوايا.',
  alternates: { canonical: '/libraries' },
}

type LibraryCard = {
  href: string
  title: string
  description: string
  count: string
  icon: LucideIcon
}

const LIBRARIES: LibraryCard[] = [
  {
    href: '/adhkar',
    title: 'مكتبة الأذكار',
    description: 'أذكار الصباح والمساء وبعد الصلاة والنوم، بنصوصها ومصادرها.',
    count: `${toArabicIndic(ADHKAR_LIBRARY.length)} أقسام · ${toArabicIndic(
      ADHKAR_LIBRARY.reduce((sum, category) => sum + category.items.length, 0),
    )} ذِكرًا`,
    icon: Sparkles,
  },
  {
    href: '/niyyat',
    title: 'مكتبة النوايا',
    description: 'نيّة مستحضرة لكل عمل — إنما الأعمال بالنيات.',
    count: `${toArabicIndic(INTENTIONS_LIBRARY.length)} عملًا · ${toArabicIndic(
      INTENTIONS_LIBRARY.reduce((sum, deed) => sum + deed.intentions.length, 0),
    )} نيّة`,
    icon: HeartHandshake,
  },
]

// Libraries hub (NBD-22): the المكتبات tab lands here; each library is one tap away.
export default function LibrariesPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-10 md:px-6">
      <PageHeader title="المكتبات" backHref="/" />
      <ul className="flex flex-col gap-4" data-testid="libraries-hub">
        {LIBRARIES.map((library) => (
          <li key={library.href}>
            <Link
              href={library.href}
              className="border-border bg-surface shadow-card-sm hover:border-accent/40 hover:shadow-card group flex items-center gap-4 rounded-card border p-4 transition-all"
            >
              <span
                aria-hidden
                className="bg-primary/10 text-primary flex size-14 shrink-0 items-center justify-center rounded-icon transition-colors group-hover:bg-primary group-hover:text-on-primary"
              >
                <library.icon className="size-7" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-display text-title text-primary">{library.title}</span>
                <span className="text-muted-foreground text-small">{library.description}</span>
                <span className="text-gold text-label font-medium">{library.count}</span>
              </span>
              <ChevronLeft
                aria-hidden
                className="text-faint group-hover:text-primary size-5 shrink-0 transition-colors"
              />
            </Link>
          </li>
        ))}
      </ul>

      <p aria-hidden className="text-faint text-center text-title">
        ۞
      </p>
    </main>
  )
}
