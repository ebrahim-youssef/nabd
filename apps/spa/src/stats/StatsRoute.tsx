import { ChevronLeft, RotateCcw } from 'lucide-react'
import { Link } from 'react-router'

import { QADA_COPY, shellCopy } from '@nabd/shared'

import { PageHeader } from '../app/PageHeader'
import { WirdStats } from './WirdStats'

export function StatsRoute() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={shellCopy.nav.stats} backHref="/app" />
      <WirdStats />
      {/* المحاسبة door to the qada ledger (NBD-39). */}
      <Link
        to="/app/qada"
        data-testid="qada-link"
        className="group flex items-center gap-4 rounded-card border border-border bg-surface p-4 shadow-card-small transition-all hover:border-accent/40 hover:shadow-card"
      >
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-icon bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-on-primary"
        >
          <RotateCcw className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-display text-title text-primary">{QADA_COPY.pageTitle}</span>
          <span className="text-small text-muted-foreground">{QADA_COPY.statsDescription}</span>
        </span>
        <ChevronLeft aria-hidden className="size-5 shrink-0 text-muted-foreground" />
      </Link>
    </div>
  )
}
