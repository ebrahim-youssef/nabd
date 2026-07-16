'use client'

import { useState } from 'react'

import { today } from '@/lib/impure/clock'
import { toArabicIndic } from '@/lib/pure/format'

import { useWirdChecklist } from '../hooks/useWirdChecklist'
import { summarizeChecklist } from '../logic'

// Ring geometry: viewBox units, not pixels — rendered size comes from the CSS classes.
const RING_RADIUS = 42
const RING_STROKE = 8
const RING_CENTER = RING_RADIUS + RING_STROKE / 2
const RING_SIZE = RING_CENTER * 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

// Today's progress at a glance (NBD-10, visual per NBD-20): a progress ring filled to
// done/total, derived from the same live checklist view so it can never disagree with it.
export function TodaySummary() {
  const [day] = useState(() => today())
  const { areas, isLoading } = useWirdChecklist(day)

  if (isLoading) {
    return <div className="bg-surface-2 h-28 w-full animate-pulse rounded-card" aria-hidden />
  }

  const { total, done, remaining, voluntary } = summarizeChecklist(areas)
  if (total === 0 && voluntary.total === 0) return null

  const fraction = done / total
  const dashOffset = RING_CIRCUMFERENCE * (1 - fraction)

  return (
    <div
      className="bg-primary text-on-primary flex items-center gap-5 rounded-card p-5"
      data-testid="today-summary"
    >
      <svg
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="size-24 shrink-0"
        role="img"
        aria-label={`أنجزت ${toArabicIndic(done)} من ${toArabicIndic(total)}`}
      >
        <circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE}
          className="stroke-on-primary/25"
        />
        <circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
          className="stroke-gold transition-[stroke-dashoffset] duration-500"
        />
        <text
          x={RING_CENTER}
          y={RING_CENTER}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-on-primary font-display text-title"
        >
          <tspan data-testid="summary-done">{toArabicIndic(done)}</tspan>
          <tspan className="fill-on-primary/70 text-small">
            {'/'}
            <tspan data-testid="summary-total">{toArabicIndic(total)}</tspan>
          </tspan>
        </text>
      </svg>

      <div className="flex flex-col gap-1">
        <span className="font-display text-title">وِرد اليوم</span>
        <span className="text-small opacity-90">
          بقي <span data-testid="summary-remaining">{toArabicIndic(remaining)}</span> من الوِرد
        </span>
        {voluntary.total > 0 && (
          <span className="text-gold text-small" data-testid="summary-voluntary">
            تطوّع: {toArabicIndic(voluntary.done)}/{toArabicIndic(voluntary.total)}
          </span>
        )}
      </div>
    </div>
  )
}
