'use client'

import { Download, Flame } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { today } from '@/lib/impure/clock'
import { lastNDays } from '@/lib/pure/day'
import { toArabicIndic } from '@/lib/pure/format'
import { cn } from '@/lib/utils'

import { useStats } from '../hooks/useStats'
import { useStatsExport } from '../hooks/useStatsExport'
import { bestStreak, currentStreak } from '../logic'
import type { AreaStat, DayCompletion } from '../types'

// The stats window: streaks and the summary read a month back; the bar chart shows the last
// week of it (design-notes-r3 §6).
const RANGE_DAYS = 30
const CHART_DAYS = 7
const WEEK_EXPORT_DAYS = 7

const WEEKDAY_FORMAT = new Intl.DateTimeFormat('ar', { weekday: 'short', timeZone: 'UTC' })

function percent(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

// Statistics page (NBD-8, visual v2 + export per NBD-31): streak flame, weekly bars,
// completion tiles, today's per-area drill-down, and a week/month export of the user's own
// data. Reads live from Dexie via useStats; every figure is computed against the wird
// version in force on each day, so past days never shift when the wird changes.
export function WirdStats() {
  const [days] = useState(() => lastNDays(today(), RANGE_DAYS))
  const { isLoading, completions, summary, todayAreas } = useStats(days)
  const { exportRange } = useStatsExport()

  if (isLoading) {
    return <div className="bg-surface-2 h-28 w-full animate-pulse rounded-card" aria-hidden />
  }

  const streak = currentStreak(completions)
  const best = bestStreak(completions)
  const lastWeek = completions.slice(-CHART_DAYS)

  return (
    <section className="flex flex-col gap-5" data-testid="wird-stats">
      <div
        className="bg-primary text-on-primary flex items-center gap-4 rounded-card p-4"
        data-testid="streak-card"
      >
        <Flame className="text-gold size-8 shrink-0" aria-hidden />
        <div className="flex flex-col">
          <span className="font-display text-title">
            {toArabicIndic(streak)} {streak === 1 ? 'يوم' : 'أيام'} متتالية
          </span>
          <span className="text-small opacity-90">أكمل وِرد اليوم لتُبقي الشعلة مشتعلة</span>
        </div>
      </div>

      <WeekChart completions={lastWeek} />

      <div className="grid grid-cols-2 gap-3">
        <div
          className="bg-surface-2 flex flex-col gap-1 rounded-card p-4"
          data-testid="tile-completion"
        >
          <span className="font-display text-title text-primary">
            {toArabicIndic(percent(summary.done, summary.total))}٪
          </span>
          <span className="text-muted-foreground text-small">إتمام الوِرد — آخر شهر</span>
        </div>
        <div
          className="bg-surface-2 flex flex-col gap-1 rounded-card p-4"
          data-testid="tile-best-streak"
        >
          <span className="font-display text-title text-primary">{toArabicIndic(best)}</span>
          <span className="text-muted-foreground text-small">أفضل سلسلة أيام مكتملة</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-title text-primary">اليوم بالتفصيل</h2>
        <ul className="flex flex-col gap-3">
          {todayAreas.map((area) => (
            <li key={area.areaId} className="flex flex-col gap-1">
              <AreaBar area={area} />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-3">
        <Download className="text-muted-foreground size-4 shrink-0" aria-hidden />
        <span className="text-muted-foreground text-small">تصدير بياناتك:</span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void exportRange(WEEK_EXPORT_DAYS, 'week')}
          data-testid="export-week"
        >
          أسبوع
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void exportRange(RANGE_DAYS, 'month')}
          data-testid="export-month"
        >
          شهر
        </Button>
      </div>
    </section>
  )
}

// Last-week completion bars: gold = fully-completed day, teal otherwise; height = the day's
// completion fraction (a hairline base keeps empty days visible).
function WeekChart({ completions }: { completions: DayCompletion[] }) {
  return (
    <div className="bg-surface-2 rounded-card p-4" data-testid="week-chart">
      <div className="flex h-28 items-end justify-between gap-2">
        {completions.map((completion) => {
          const pct = percent(completion.done, completion.total)
          const complete = completion.total > 0 && completion.done === completion.total
          return (
            <div
              key={completion.day}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              <div
                className={cn('w-full rounded-t-sm', complete ? 'bg-gold' : 'bg-primary')}
                style={{ blockSize: `${Math.max(pct, 3)}%` }}
                data-testid={`bar-${completion.day}`}
              />
              <span className="text-muted-foreground text-label">
                {WEEKDAY_FORMAT.format(new Date(`${completion.day}T12:00:00Z`))}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AreaBar({ area }: { area: AreaStat }) {
  const pct = percent(area.done, area.total)
  return (
    <>
      <div className="flex items-center justify-between text-small">
        <span className="text-foreground">{area.label}</span>
        <span className="text-muted-foreground" data-testid={`stat-${area.areaId}`}>
          {toArabicIndic(area.done)}/{toArabicIndic(area.total)}
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
