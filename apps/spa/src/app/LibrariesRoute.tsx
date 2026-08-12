import { ChevronLeft, HeartHandshake, Sparkles } from 'lucide-react'
import { Link } from 'react-router'

import {
  ADHKAR_COPY,
  ADHKAR_LIBRARY,
  INTENTIONS_COPY,
  INTENTIONS_LIBRARY,
  shellCopy,
  toArabicIndic,
} from '@nabd/shared'

import { PageHeader } from './PageHeader'

const libraries = [
  {
    href: '/app/adhkar',
    title: ADHKAR_COPY.libraryTitle,
    description: ADHKAR_COPY.hubDescription,
    count: `${toArabicIndic(ADHKAR_LIBRARY.length)} ${ADHKAR_COPY.sections} · ${toArabicIndic(ADHKAR_LIBRARY.reduce((sum, category) => sum + category.items.length, 0))} ${ADHKAR_COPY.adhkar}`,
    Icon: Sparkles,
  },
  {
    href: '/app/niyyat',
    title: INTENTIONS_COPY.libraryTitle,
    description: INTENTIONS_COPY.hubDescription,
    count: `${toArabicIndic(INTENTIONS_LIBRARY.length)} ${INTENTIONS_COPY.deeds} · ${toArabicIndic(INTENTIONS_LIBRARY.reduce((sum, deed) => sum + deed.intentions.length, 0))} ${INTENTIONS_COPY.intentions}`,
    Icon: HeartHandshake,
  },
] as const

export function LibrariesRoute() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={shellCopy.nav.libraries} backHref="/app" />
      <ul className="flex flex-col gap-4" data-testid="libraries-hub">
        {libraries.map(({ href, title, description, count, Icon }) => (
          <li key={href}>
            <Link
              to={href}
              className="group flex items-center gap-4 rounded-card border border-border bg-surface p-4 shadow-card-small transition-all hover:border-accent/40 hover:shadow-card"
            >
              <span
                aria-hidden
                className="flex size-14 shrink-0 items-center justify-center rounded-icon bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary"
              >
                <Icon className="size-7" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-display text-title text-primary">{title}</span>
                <span className="text-small text-muted-foreground">{description}</span>
                <span className="text-label font-medium text-gold">{count}</span>
              </span>
              <ChevronLeft
                aria-hidden
                className="size-5 shrink-0 text-faint transition-colors group-hover:text-primary"
              />
            </Link>
          </li>
        ))}
      </ul>
      <p aria-hidden className="text-center text-title text-faint">
        ۞
      </p>
    </div>
  )
}
