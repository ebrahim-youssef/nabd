import { Sparkles } from 'lucide-react'
import { useState } from 'react'

import { summarizeChecklist, toArabicIndic, toDayId, WIRD_COPY } from '@nabd/shared'

import { useWirdChecklist } from './useWirdChecklist'

const RING_RADIUS = 42
const RING_STROKE = 8
const RING_CENTER = RING_RADIUS + RING_STROKE / 2
const RING_SIZE = RING_CENTER * 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

export function TodaySummary() {
  const [day] = useState(() => toDayId(new Date()))
  const { areas, isLoading } = useWirdChecklist(day)

  if (isLoading) {
    return <div className="h-28 w-full animate-pulse rounded-card bg-surface2" aria-hidden />
  }

  const { total, done, remaining, voluntary } = summarizeChecklist(areas)
  if (total === 0 && voluntary.total === 0) return null

  const fraction = total > 0 ? done / total : 0
  const dashOffset = RING_CIRCUMFERENCE * (1 - fraction)

  return (
    <div
      className="pattern-khatam flex items-center gap-5 rounded-card p-5 text-on-primary shadow-card"
      data-testid="today-summary"
    >
      <svg
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="size-24 shrink-0"
        role="img"
        aria-label={WIRD_COPY.summaryAria(toArabicIndic(done), toArabicIndic(total))}
      >
        <circle
          cx={RING_CENTER}
          cy={RING_CENTER}
          r={RING_RADIUS}
          fill="none"
          strokeWidth={RING_STROKE}
          className="stroke-ring-track"
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
            /<tspan data-testid="summary-total">{toArabicIndic(total)}</tspan>
          </tspan>
        </text>
      </svg>
      <div className="flex min-w-0 flex-col gap-1.5">
        <span className="flex items-center gap-2 font-display text-title">
          {WIRD_COPY.todayTitle}
          <Sparkles aria-hidden className="size-4 text-gold" />
        </span>
        <span className="text-small opacity-90">
          {WIRD_COPY.remainingPrefix}{' '}
          <span data-testid="summary-remaining">{toArabicIndic(remaining)}</span>{' '}
          {WIRD_COPY.remainingSuffix}
        </span>
        {voluntary.total > 0 && (
          <span className="text-small text-gold" data-testid="summary-voluntary">
            {WIRD_COPY.voluntary}: {toArabicIndic(voluntary.done)}/{toArabicIndic(voluntary.total)}
          </span>
        )}
      </div>
    </div>
  )
}
