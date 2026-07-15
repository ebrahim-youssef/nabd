import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

// Sticky sub-page header (NBD-22): title + a back arrow that is always on screen — the user
// never scrolls to navigate back. In RTL, "back" points right.
export function PageHeader({ title, backHref }: { title: string; backHref: string }) {
  return (
    <header className="bg-background/95 sticky top-0 z-30 -mx-4 flex items-center gap-3 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
      <Link
        href={backHref}
        aria-label="رجوع"
        data-testid="page-back"
        className="text-primary flex size-9 items-center justify-center rounded-full transition-colors hover:bg-surface-2"
      >
        <ArrowRight className="size-5" aria-hidden />
      </Link>
      <h1 className="font-display text-title text-primary">{title}</h1>
    </header>
  )
}
