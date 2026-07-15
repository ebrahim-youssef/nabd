'use client'

import { useState } from 'react'

import { today } from '@/lib/impure/clock'
import { lastNDays } from '@/lib/pure/day'

import { useStats } from '../hooks/useStats'
import type { AreaStat } from '../types'

const RANGE_DAYS = 7

function percent(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

// Statistics panel (NBD-8): a rolling summary of the last week plus today's per-area drill-down.
// Reads live from Dexie via useStats; every figure is computed against the wird version in force
// on each day, so past days never shift when the wird changes.
export function WirdStats() {
  const [days] = useState(() => lastNDays(today(), RANGE_DAYS))
  const { isLoading, summary, todayAreas } = useStats(days)

  if (isLoading) {
    return <div className="bg-surface-2 h-28 w-full animate-pulse rounded-card" aria-hidden />
  }

  return (
    <section className="flex flex-col gap-4" data-testid="wird-stats">
      <h2 className="font-display text-title text-primary">الإحصائيات</h2>

      <p className="text-muted-foreground text-body">
        آخر {summary.days} أيام: {summary.completedDays} مكتملة ·{' '}
        {percent(summary.done, summary.total)}٪ من الوِرد
      </p>

      <ul className="flex flex-col gap-3">
        {todayAreas.map((area) => (
          <li key={area.areaId} className="flex flex-col gap-1">
            <AreaBar area={area} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function AreaBar({ area }: { area: AreaStat }) {
  const pct = percent(area.done, area.total)
  return (
    <>
      <div className="flex items-center justify-between text-small">
        <span className="text-foreground">{area.label}</span>
        <span className="text-muted-foreground" data-testid={`stat-${area.areaId}`}>
          {area.done}/{area.total}
        </span>
      </div>
      <div className="bg-surface-2 h-2 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all"
          style={{ inlineSize: `${pct}%` }}
        />
      </div>
    </>
  )
}
