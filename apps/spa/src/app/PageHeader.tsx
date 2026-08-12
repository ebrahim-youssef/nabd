import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'

import { shellCopy } from '@nabd/shared'

// Sticky sub-page header (NBD-22): title + a back arrow that is always on screen — the user
// never scrolls to navigate back. In RTL, "back" points right.
export function PageHeader({ title, backHref }: { title: string; backHref: string }) {
  return (
    <header className="sticky top-0 z-30 -mx-4 flex items-center gap-3 bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
      <Link
        to={backHref}
        aria-label={shellCopy.back}
        data-testid="page-back"
        className="flex size-9 items-center justify-center rounded-full border border-border bg-surface text-primary shadow-card-small transition-colors hover:bg-primary hover:text-on-primary"
      >
        <ArrowRight className="size-5" aria-hidden />
      </Link>
      <h1 className="font-display text-title text-primary">{title}</h1>
    </header>
  )
}
