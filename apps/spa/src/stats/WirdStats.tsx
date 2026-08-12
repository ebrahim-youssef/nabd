import { ChevronDown, Download, Flame } from 'lucide-react'
import { useState } from 'react'

import {
  bestStreak,
  currentStreak,
  lastNDays,
  STATS_COPY,
  toArabicIndic,
  toDayId,
} from '@nabd/shared'
import type { AreaStat, DayCompletion, ItemStat } from '@nabd/shared'

import { useItemStats } from './useItemStats'
import { useStats } from './useStats'
import { useStatsExport } from './useStatsExport'

// The stats window: streaks and the summary read a month back; the bar chart shows the last
// week of it (design-notes-r3 §6).
const RANGE_DAYS = 30
const CHART_DAYS = 7
const WEEK_EXPORT_DAYS = 7

// UTC is load-bearing: a DayId is a date-only string, so formatting it in the machine zone shifts
// the weekday label by a day for anyone west of UTC.
const WEEKDAY_FORMAT = new Intl.DateTimeFormat('ar', { weekday: 'short', timeZone: 'UTC' })

function percent(done: number, total: number): number {
  return total > 0 ? Math.round((done / total) * 100) : 0
}

// Statistics page (NBD-8, visual v2 + export per NBD-31): streak flame, weekly bars,
// completion tiles, today's per-area drill-down, and a week/month export of the user's own
// data. Reads live from Dexie via useStats; every figure is computed against the wird
// version in force on each day, so past days never shift when the wird changes.
export function WirdStats() {
  const [days] = useState(() => lastNDays(toDayId(new Date()), RANGE_DAYS))
  const { isLoading, completions, summary, todayAreas } = useStats(days)
  const { exportRange } = useStatsExport()

  if (isLoading) {
    return <div className="h-28 w-full animate-pulse rounded-card bg-surface2" aria-hidden />
  }

  const streak = currentStreak(completions)
  const best = bestStreak(completions)
  const lastWeek = completions.slice(-CHART_DAYS)

  return (
    <section className="flex flex-col gap-5" data-testid="wird-stats">
      <div
        className="pattern-khatam flex items-center gap-4 rounded-card p-4 text-on-primary shadow-card"
        data-testid="streak-card"
      >
        <span
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-icon bg-on-primary/10"
        >
          <Flame className="size-8 text-gold" />
        </span>
        <div className="flex flex-col">
          <span className="font-display text-title">
            {toArabicIndic(streak)}{' '}
            {streak === 1 ? STATS_COPY.streakSingular : STATS_COPY.streakPlural}{' '}
            {STATS_COPY.streakSuffix}
          </span>
          <span className="text-small opacity-90">{STATS_COPY.streakPrompt}</span>
        </div>
      </div>

      <WeekChart completions={lastWeek} />

      <div className="grid grid-cols-2 gap-3">
        <div
          className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4 shadow-card-small"
          data-testid="tile-completion"
        >
          <span
            className="font-display text-display text-primary"
            data-testid="tile-completion-value"
          >
            {toArabicIndic(percent(summary.done, summary.total))}
            <span className="text-title text-gold">٪</span>
          </span>
          <span className="text-small text-muted-foreground">{STATS_COPY.completionTile}</span>
        </div>
        <div
          className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4 shadow-card-small"
          data-testid="tile-best-streak"
        >
          <span
            className="font-display text-display text-primary"
            data-testid="tile-best-streak-value"
          >
            {toArabicIndic(best)}
            <span className="text-title text-gold"> ✦</span>
          </span>
          <span className="text-small text-muted-foreground">{STATS_COPY.bestStreakTile}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-title text-primary">{STATS_COPY.todayDetail}</h2>
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
        <Download className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="text-small text-muted-foreground">{STATS_COPY.exportData}</span>
        <button
          type="button"
          onClick={() => void exportRange(WEEK_EXPORT_DAYS, 'week')}
          data-testid="export-week"
          className="rounded-button bg-surface2 px-3 py-1.5 text-small font-medium text-foreground transition-colors hover:bg-primary/10"
        >
          {STATS_COPY.exportWeek}
        </button>
        <button
          type="button"
          onClick={() => void exportRange(RANGE_DAYS, 'month')}
          data-testid="export-month"
          className="rounded-button bg-surface2 px-3 py-1.5 text-small font-medium text-foreground transition-colors hover:bg-primary/10"
        >
          {STATS_COPY.exportMonth}
        </button>
      </div>
    </section>
  )
}

// Last-week completion bars: gold = fully-completed day, teal otherwise; height = the day's
// completion fraction (a hairline base keeps empty days visible).
function WeekChart({ completions }: { completions: DayCompletion[] }) {
  return (
    <div
      className="rounded-card border border-border bg-surface p-4 shadow-card-small"
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
              <div className="relative flex h-full w-full max-w-6 items-end overflow-hidden rounded-full bg-surface2">
                <div
                  className={`w-full rounded-full transition-[block-size] duration-500 ${complete ? 'bg-gold' : 'bg-primary'}`}
                  style={{ blockSize: `${Math.max(pct, 6)}%` }}
                  data-testid={`bar-${completion.day}`}
                />
              </div>
              <span
                className={`text-label ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}
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
    <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-3 shadow-card-small">
      <div className="flex items-center justify-between text-small">
        <span className="font-medium text-foreground">{area.label}</span>
        <span className="text-muted-foreground" data-testid={`stat-${area.areaId}`}>
          {toArabicIndic(area.done)}/{toArabicIndic(area.total)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${complete ? 'bg-gold' : 'bg-primary'}`}
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
      className="group rounded-card border border-border bg-surface shadow-card-small"
      data-testid="item-stats"
    >
      <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 font-display text-title text-primary [&::-webkit-details-marker]:hidden">
        {STATS_COPY.itemStats} ({toArabicIndic(stats.length)})
        <ChevronDown
          aria-hidden
          className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
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
      className="flex flex-col gap-1.5 rounded-card border border-border bg-surface2/40 p-3"
      data-testid={`item-stat-${stat.itemId}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-body text-foreground">{stat.label}</span>
        {stat.optional ? (
          <span className="shrink-0 rounded-chip bg-gold-soft px-2 py-0.5 text-label text-gold">
            {STATS_COPY.voluntary}
          </span>
        ) : (
          <span
            className="shrink-0 text-small font-medium tabular-nums text-primary"
            data-testid={`item-consistency-${stat.itemId}`}
          >
            {toArabicIndic(consistencyPct)}٪
          </span>
        )}
      </div>

      {stat.optional ? (
        <span className="text-small text-muted-foreground">
          {STATS_COPY.optionalStats(
            toArabicIndic(stat.doneDays),
            toArabicIndic(stat.longestStreak),
          )}
          {/* Hidden while the window is empty (deed added mid-week) — «٠/٠» reads as noise. */}
          {stat.attainment &&
            stat.attainment.window > 0 &&
            STATS_COPY.attainment(
              toArabicIndic(stat.attainment.done),
              toArabicIndic(stat.attainment.window),
            )}
        </span>
      ) : (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-small text-muted-foreground">
          <span className="flex items-center gap-1">
            <Flame className="size-3.5 text-gold" aria-hidden />
            {toArabicIndic(stat.currentStreak)} {STATS_COPY.consecutive}
          </span>
          <span data-testid={`item-missed-${stat.itemId}`}>
            {STATS_COPY.missed} {toArabicIndic(stat.missedDays)}
            {stat.currentMissStreak > 1 &&
              ` (${toArabicIndic(stat.currentMissStreak)} ${STATS_COPY.consecutive})`}
          </span>
          <span>
            {toArabicIndic(stat.doneDays)}/{toArabicIndic(stat.activeDays)} {STATS_COPY.day}
          </span>
        </span>
      )}

      {!stat.optional && (
        <span aria-hidden className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
          <span
            className="block h-full rounded-full bg-primary transition-[inline-size] duration-500"
            style={{ inlineSize: `${consistencyPct}%` }}
          />
        </span>
      )}
    </div>
  )
}
