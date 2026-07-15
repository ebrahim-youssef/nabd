'use client'

import { useState } from 'react'

import { today } from '@/lib/impure/clock'

import { useWirdChecklist } from '../hooks/useWirdChecklist'
import { summarizeChecklist } from '../logic'

// Today's progress at a glance (NBD-10): how much of the day's wird is done vs. remaining.
// Derived from the same live checklist view, so the counts always match the checklist.
export function TodaySummary() {
  const [day] = useState(() => today())
  const { areas, isLoading } = useWirdChecklist(day)

  if (isLoading) {
    return <div className="bg-surface-2 h-16 w-full animate-pulse rounded-card" aria-hidden />
  }

  const { total, done, remaining } = summarizeChecklist(areas)
  if (total === 0) return null

  return (
    <div
      className="bg-surface-2 flex items-center justify-between rounded-card p-4"
      data-testid="today-summary"
    >
      <span className="text-body text-foreground">
        أنجزت <span data-testid="summary-done">{done}</span> من{' '}
        <span data-testid="summary-total">{total}</span>
      </span>
      <span className="text-muted-foreground text-small">
        بقي <span data-testid="summary-remaining">{remaining}</span>
      </span>
    </div>
  )
}
