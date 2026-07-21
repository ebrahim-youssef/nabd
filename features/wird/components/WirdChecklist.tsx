'use client'

import { BookOpen, Check, ChevronDown, Clock, HeartHandshake, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { DhikrCounter } from '@/features/counter/components/DhikrCounter'
import { PrayerTimeBadge } from '@/features/prayer-times/components/PrayerTimeBadge'
import { PrayerTimesBar } from '@/features/prayer-times/components/PrayerTimesBar'
import { today } from '@/lib/impure/clock'
import { toArabicIndic } from '@/lib/pure/format'
import { cn } from '@/lib/utils'

import { useToggleItem } from '../hooks/useToggleItem'
import { useWirdChecklist } from '../hooks/useWirdChecklist'
import type { ChecklistAreaView, ChecklistItemView } from '../types'

// The area whose header carries the live prayer sub-header + per-item adhan times
// (ADR-0009). Matches the area id used by every level in content/levels.ts.
const PRAYERS_AREA_ID = 'prayers'

// One glyph per area (ids from content/levels.ts) so the four sections read at a glance;
// BookOpen doubles as the adhkar-library link icon further down.
const AREA_ICONS: Record<string, LucideIcon> = {
  prayers: Clock,
  quran: BookOpen,
  adhkar: Sparkles,
  tatawwu: HeartHandshake,
}

// Wird items that deep-link to their adhkar-library tab (NBD-29; per-prayer items NBD-40):
// the user can check off directly here, or read/run the flow there — the once-daily tabs
// mark the item back automatically.
const ITEM_TO_ADHKAR_TAB: Record<string, string> = {
  'morning-adhkar': 'morning',
  'evening-adhkar': 'evening',
  'prayer-adhkar-fajr': 'after-prayer',
  'prayer-adhkar-dhuhr': 'after-prayer',
  'prayer-adhkar-asr': 'after-prayer',
  'prayer-adhkar-maghrib': 'after-prayer',
  'prayer-adhkar-isha': 'after-prayer',
  istighfar: 'daily',
  habibatan: 'daily',
  baqiyat: 'daily',
  tahlil: 'daily',
  salawat: 'daily',
}

// The daily wird checklist (NBD-7). Reads live from Dexie so a check-off survives an offline
// reload, and writes append-only entries on tap. The first version is seeded by onboarding
// (NBD-6), which gates this component — by the time it renders, a version exists.
// Areas render as accordions (NBD-21): open by default, header count stays live even when
// the body is collapsed.
export function WirdChecklist() {
  // Fix the day on mount so the live query key is stable for the session.
  const [day] = useState(() => today())
  const { areas, isLoading, versionId } = useWirdChecklist(day)
  const { toggle } = useToggleItem()
  // Collapsed area ids — everything starts open, so we track the exceptions.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())

  if (isLoading) {
    return <div className="bg-surface-2 h-40 w-full animate-pulse rounded-card" aria-hidden />
  }

  if (!versionId || areas.length === 0) {
    return <p className="text-muted-foreground text-body">لا يوجد وِرد بعد.</p>
  }

  const toggleArea = (areaId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(areaId)) next.delete(areaId)
      else next.add(areaId)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4" data-testid="wird-checklist">
      {areas.map((area) => {
        const isOpen = !collapsed.has(area.id)
        return (
          <section key={area.id} className="flex flex-col gap-2">
            <AreaHeader area={area} isOpen={isOpen} onToggle={() => toggleArea(area.id)} />
            {/* Never collapses with the accordion (ADR-0009): the countdown stays visible. */}
            {area.id === PRAYERS_AREA_ID && <PrayerTimesBar />}
            {isOpen && (
              <ul className="flex flex-col gap-2" data-testid={`area-items-${area.id}`}>
                {area.items.map((item) => (
                  <li key={item.id} className="flex items-stretch gap-2">
                    <div className="min-w-0 flex-1">
                      {item.kind === 'counter' && item.target && !ITEM_TO_ADHKAR_TAB[item.id] ? (
                        <DhikrCounter
                          day={day}
                          versionId={versionId}
                          itemId={item.id}
                          label={item.label}
                          target={item.target}
                          done={item.done}
                        />
                      ) : (
                        <ChecklistRow
                          item={item}
                          showPrayerTime={area.id === PRAYERS_AREA_ID}
                          onToggle={() => toggle(day, versionId, item.id, !item.done)}
                        />
                      )}
                    </div>
                    {ITEM_TO_ADHKAR_TAB[item.id] && (
                      <Link
                        href={`/adhkar?tab=${ITEM_TO_ADHKAR_TAB[item.id]}`}
                        aria-label={`افتح ${item.label} في مكتبة الأذكار`}
                        data-testid={`adhkar-link-${item.id}`}
                        className="border-border bg-surface text-primary shadow-card-sm hover:border-gold/40 hover:text-gold flex w-11 shrink-0 items-center justify-center rounded-card border transition-colors"
                      >
                        <BookOpen className="size-5" aria-hidden />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

function AreaHeader({
  area,
  isOpen,
  onToggle,
}: {
  area: ChecklistAreaView
  isOpen: boolean
  onToggle: () => void
}) {
  // Required items drive the count (ADR-0008); an all-تطوّع area falls back to all items so
  // its header never reads ٠/٠.
  const required = area.items.filter((item) => !item.optional)
  const counted = required.length > 0 ? required : area.items
  const doneCount = counted.filter((item) => item.done).length
  const complete = doneCount === counted.length
  const Icon = AREA_ICONS[area.id]
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      data-testid={`area-header-${area.id}`}
      className="flex w-full flex-col gap-2 rounded-card py-1 text-start"
    >
      <span className="flex w-full items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <span
              aria-hidden
              className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-icon"
            >
              <Icon className="size-4.5" />
            </span>
          )}
          <h2 className="font-display text-title text-primary truncate">{area.label}</h2>
          <ChevronDown
            aria-hidden
            className={cn(
              'text-muted-foreground size-5 shrink-0 transition-transform',
              !isOpen && 'rotate-180',
            )}
          />
        </span>
        <span
          className={cn(
            'rounded-chip border px-2.5 py-0.5 text-small shrink-0 transition-colors',
            complete
              ? 'border-gold/40 bg-gold-soft text-gold'
              : 'border-border bg-surface text-muted-foreground shadow-card-sm',
          )}
          data-testid={`area-count-${area.id}`}
        >
          {toArabicIndic(doneCount)}/{toArabicIndic(counted.length)}
        </span>
      </span>
      {/* Live completion hairline: the area's progress readable even when collapsed. */}
      <span aria-hidden className="bg-border block h-1 w-full overflow-hidden rounded-full">
        <span
          className={cn(
            'block h-full rounded-full transition-[inline-size] duration-500',
            complete ? 'bg-gold' : 'bg-accent',
          )}
          style={{ inlineSize: `${counted.length > 0 ? (doneCount / counted.length) * 100 : 0}%` }}
        />
      </span>
    </button>
  )
}

function ChecklistRow({
  item,
  showPrayerTime,
  onToggle,
}: {
  item: ChecklistItemView
  showPrayerTime?: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={item.done}
      onClick={onToggle}
      data-testid={`wird-item-${item.id}`}
      className={cn(
        'group flex w-full items-center gap-3 rounded-card border p-3 text-start transition-all duration-200 active:scale-[0.99]',
        item.done
          ? 'border-primary/20 bg-primary/10'
          : 'border-border bg-surface shadow-card-sm hover:border-accent/40',
      )}
    >
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
          item.done
            ? 'border-primary bg-primary text-on-primary'
            : 'border-faint group-hover:border-accent',
        )}
      >
        {item.done && <Check className="animate-in zoom-in size-4 duration-200" aria-hidden />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <span className={cn('text-body', item.done && 'text-muted-foreground line-through')}>
          {item.label}
        </span>
        {(item.minimum || item.monthlyProgress) && (
          <span className="text-muted-foreground text-small">
            {item.minimum}
            {item.minimum && item.monthlyProgress && ' — '}
            {item.monthlyProgress && (
              <span data-testid={`monthly-progress-${item.id}`}>
                {toArabicIndic(item.monthlyProgress.done)}/
                {toArabicIndic(item.monthlyProgress.target)} هذا الشهر
              </span>
            )}
          </span>
        )}
      </span>
      {showPrayerTime && <PrayerTimeBadge prayerId={item.id} />}
      {item.targetToday && (
        <span
          data-testid={`target-today-${item.id}`}
          className="border-primary/40 bg-primary/10 text-primary rounded-chip border px-2 py-0.5 text-label shrink-0"
        >
          اليوم مستحب
        </span>
      )}
      {item.optional && (
        <span className="bg-gold-soft text-gold rounded-chip px-2 py-0.5 text-label shrink-0">
          تطوّع
        </span>
      )}
    </button>
  )
}
