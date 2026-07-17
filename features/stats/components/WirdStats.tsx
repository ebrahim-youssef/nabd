'use client'

import { ChevronDown, Download, Flame } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { today } from '@/lib/impure/clock'
import { lastNDays } from '@/lib/pure/day'
import { toArabicIndic } from '@/lib/pure/format'
import { cn } from '@/lib/utils'

import { useItemStats } from '../hooks/useItemStats'
import { useStats } from '../hooks/useStats'
import { useStatsExport } from '../hooks/useStatsExport'
import { bestStreak, currentStreak } from '../logic'
import type { AreaStat, DayCompletion, ItemStat } from '../types'

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
        className="pattern-khatam text-on-primary shadow-card flex items-center gap-4 rounded-card p-4"
        data-testid="streak-card"
      >
        <span
          aria-hidden
          className="bg-on-primary/10 flex size-14 shrink-0 items-center justify-center rounded-icon"
        >
          <Flame className="text-gold size-8" />
        </span>
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
          className="border-border bg-surface shadow-card-sm flex flex-col gap-1 rounded-card border p-4"
          data-testid="tile-completion"
        >
          <span className="font-display text-display text-primary">
            {toArabicIndic(percent(summary.done, summary.total))}
            <span className="text-gold text-title">٪</span>
          </span>
          <span className="text-muted-foreground text-small">إتمام الوِرد — آخر شهر</span>
        </div>
        <div
          className="border-border bg-surface shadow-card-sm flex flex-col gap-1 rounded-card border p-4"
          data-testid="tile-best-streak"
        >
          <span className="font-display text-display text-primary">
            {toArabicIndic(best)}
            <span className="text-gold text-title"> ✦</span>
          </span>
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

      <ItemStatsSection />

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
    <div
      className="border-border bg-surface shadow-card-sm rounded-card border p-4"
      data-testid="week-chart"
    >
      <div className="flex h-28 items-end justify-between gap-2">
        {completions.map((completion, index) => {
          const pct = percent(completion.done, completion.total)
          const complete = completion.total > 0 && completion.done === completion.total
          const isToday = index === completions.length - 1
          return (
            <div
              key={completion.day}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            >
              {/* Full-height track — empty days read as beads on a string, not missing data. */}
              <div className="bg-surface-2 relative flex h-full w-full max-w-6 items-end overflow-hidden rounded-full">
                <div
                  className={cn(
                    'w-full rounded-full transition-[block-size] duration-500',
                    complete ? 'bg-gold' : 'bg-primary',
                  )}
                  style={{ blockSize: `${Math.max(pct, 6)}%` }}
                  data-testid={`bar-${completion.day}`}
                />
              </div>
              <span
                className={cn(
                  'text-label',
                  isToday ? 'text-primary font-bold' : 'text-muted-foreground',
                )}
              >
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
  const complete = area.total > 0 && area.done === area.total
  return (
    <div className="border-border bg-surface shadow-card-sm flex flex-col gap-2 rounded-card border p-3">
      <div className="flex items-center justify-between text-small">
        <span className="text-foreground font-medium">{area.label}</span>
        <span className="text-muted-foreground" data-testid={`stat-${area.areaId}`}>
          {toArabicIndic(area.done)}/{toArabicIndic(area.total)}
        </span>
      </div>
      <div className="bg-surface-2 h-2 w-full overflow-hidden rounded-full">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            complete ? 'bg-gold' : 'bg-primary',
          )}
          style={{ inlineSize: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// Per-item accountability (NBD-47): each current wird item's own history — consistency, streak,
// and misses for required items; times-done + attainment for تطوّع. Collapsed by default so the
// long list stays out of the way; every item is one expand away from its history.
function ItemStatsSection() {
  const { isLoading, stats } = useItemStats()
  if (isLoading || stats.length === 0) return null
  return (
    <details
      className="group border-border bg-surface shadow-card-sm rounded-card border"
      data-testid="item-stats"
    >
      <summary className="font-display text-title text-primary flex cursor-pointer items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
        محاسبة العناصر ({toArabicIndic(stats.length)})
        <ChevronDown
          aria-hidden
          className="text-muted-foreground size-5 shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <ul className="flex flex-col gap-2 px-4 pb-4">
        {stats.map((stat) => (
          <li key={stat.itemId}>
            <ItemStatRow stat={stat} />
          </li>
        ))}
      </ul>
    </details>
  )
}

function ItemStatRow({ stat }: { stat: ItemStat }) {
  const consistencyPct = percent(stat.doneDays, stat.activeDays)
  return (
    <div
      className="border-border bg-surface-2/40 flex flex-col gap-1.5 rounded-card border p-3"
      data-testid={`item-stat-${stat.itemId}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-body text-foreground min-w-0 truncate">{stat.label}</span>
        {stat.optional ? (
          <span className="bg-gold-soft text-gold rounded-chip px-2 py-0.5 text-label shrink-0">
            تطوّع
          </span>
        ) : (
          <span
            className="text-primary text-small shrink-0 font-medium tabular-nums"
            data-testid={`item-consistency-${stat.itemId}`}
          >
            {toArabicIndic(consistencyPct)}٪
          </span>
        )}
      </div>

      {stat.optional ? (
        <span className="text-muted-foreground text-small">
          أُدّيت {toArabicIndic(stat.doneDays)} — أطول تتابع {toArabicIndic(stat.longestStreak)}
          {/* Hidden while the window is empty (deed added mid-week) — «٠/٠» reads as noise. */}
          {stat.attainment &&
            stat.attainment.window > 0 &&
            ` — أيام الاستهداف ${toArabicIndic(stat.attainment.done)}/${toArabicIndic(
              stat.attainment.window,
            )}`}
        </span>
      ) : (
        <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-small">
          <span className="flex items-center gap-1">
            <Flame className="text-gold size-3.5" aria-hidden />
            {toArabicIndic(stat.currentStreak)} متتالية
          </span>
          <span data-testid={`item-missed-${stat.itemId}`}>
            فات {toArabicIndic(stat.missedDays)}
            {stat.currentMissStreak > 1 && ` (${toArabicIndic(stat.currentMissStreak)} متتالية)`}
          </span>
          <span>
            {toArabicIndic(stat.doneDays)}/{toArabicIndic(stat.activeDays)} يوم
          </span>
        </span>
      )}

      {!stat.optional && (
        <span aria-hidden className="bg-surface-2 mt-0.5 h-1.5 w-full overflow-hidden rounded-full">
          <span
            className="bg-primary block h-full rounded-full transition-[inline-size] duration-500"
            style={{ inlineSize: `${consistencyPct}%` }}
          />
        </span>
      )}
    </div>
  )
}
