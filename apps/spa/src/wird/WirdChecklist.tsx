import { BookOpen, Check, ChevronDown, Clock, HeartHandshake, Sparkles } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'

import { toArabicIndic, toDayId, WIRD_COPY } from '@nabd/shared'
import type { ChecklistAreaView, ChecklistItemView } from '@nabd/shared'

import { DhikrCounter } from '../counter/DhikrCounter'
import { PrayerTimeBadge } from '../prayer-times/PrayerTimeBadge'
import { PrayerTimesBar } from '../prayer-times/PrayerTimesBar'
import { useToggleItem } from './useToggleItem'
import { useWirdChecklist } from './useWirdChecklist'

// The one area whose items are prayers, so the only one that carries the times sub-header and the
// per-item time badges.
const PRAYERS_AREA_ID = 'prayers'

const AREA_ICONS: Record<string, LucideIcon> = {
  prayers: Clock,
  quran: BookOpen,
  adhkar: Sparkles,
  tatawwu: HeartHandshake,
}

export function WirdChecklist() {
  const [day] = useState(() => toDayId(new Date()))
  const { areas, isLoading, versionId } = useWirdChecklist(day)
  const { toggle, pendingItemIds, hasError } = useToggleItem()
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())

  if (isLoading) {
    return <div className="h-40 w-full animate-pulse rounded-card bg-surface2" aria-hidden />
  }

  if (!versionId || areas.length === 0) {
    return <p className="text-body text-muted-foreground">{WIRD_COPY.empty}</p>
  }

  function toggleArea(areaId: string) {
    setCollapsed((previous) => {
      const next = new Set(previous)
      if (next.has(areaId)) next.delete(areaId)
      else next.add(areaId)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4" data-testid="wird-checklist">
      {hasError && (
        <p role="alert" className="m-0 text-small text-destructive">
          {WIRD_COPY.toggleError}
        </p>
      )}
      {areas.map((area) => {
        const isOpen = !collapsed.has(area.id)
        return (
          <section key={area.id} className="flex flex-col gap-2">
            <AreaHeader area={area} isOpen={isOpen} onToggle={() => toggleArea(area.id)} />
            {area.id === PRAYERS_AREA_ID && <PrayerTimesBar />}
            {isOpen && (
              <ul className="flex flex-col gap-2" data-testid={`area-items-${area.id}`}>
                {area.items.map((item) => (
                  <li key={item.id}>
                    {item.kind === 'counter' && item.target ? (
                      <DhikrCounter
                        day={day}
                        itemId={item.id}
                        label={item.label}
                        target={item.target}
                        done={item.done}
                      />
                    ) : (
                      <ChecklistRow
                        item={item}
                        isPrayer={area.id === PRAYERS_AREA_ID}
                        disabled={pendingItemIds.has(item.id)}
                        onToggle={() => void toggle(day, item.id, !item.done)}
                      />
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
  const required = area.items.filter((item) => !item.optional)
  const counted = required.length > 0 ? required : area.items
  const doneCount = counted.filter((item) => item.done).length
  const complete = counted.length > 0 && doneCount === counted.length
  const progress = counted.length > 0 ? (doneCount / counted.length) * 100 : 0
  const Icon = AREA_ICONS[area.id]

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      data-testid={`area-header-${area.id}`}
      className="flex w-full flex-col gap-2 rounded-card py-1 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex w-full items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-icon bg-primary/10 text-primary"
            >
              <Icon className="size-4" />
            </span>
          )}
          <h2 className="truncate font-display text-title text-primary">{area.label}</h2>
          <ChevronDown
            aria-hidden
            className={`size-5 shrink-0 text-muted-foreground transition-transform ${!isOpen ? 'rotate-180' : ''}`}
          />
        </span>
        <span
          className={`shrink-0 rounded-chip border px-2.5 py-0.5 text-small transition-colors ${
            complete
              ? 'border-gold/40 bg-gold-soft text-gold'
              : 'border-border bg-surface text-muted-foreground shadow-card-small'
          }`}
          data-testid={`area-count-${area.id}`}
        >
          {toArabicIndic(doneCount)}/{toArabicIndic(counted.length)}
        </span>
      </span>
      <span aria-hidden className="block h-1 w-full overflow-hidden rounded-chip bg-border">
        <span
          className={`block h-full rounded-chip transition-[inline-size] duration-500 ${complete ? 'bg-gold' : 'bg-accent'}`}
          style={{ inlineSize: `${progress}%` }}
        />
      </span>
    </button>
  )
}

function ChecklistRow({
  item,
  isPrayer,
  disabled,
  onToggle,
}: {
  item: ChecklistItemView
  isPrayer: boolean
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={item.done}
      disabled={disabled}
      onClick={onToggle}
      data-testid={`wird-item-${item.id}`}
      className={`group flex w-full items-center gap-3 rounded-card border p-3 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        item.done
          ? 'border-primary/20 bg-primary/10'
          : 'border-border bg-surface shadow-card-small hover:border-accent/40'
      }`}
    >
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-icon border-2 transition-colors ${
          item.done
            ? 'border-primary bg-primary text-on-primary'
            : 'border-faint group-hover:border-accent'
        }`}
      >
        {item.done && <Check className="size-4" aria-hidden />}
      </span>
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <span className={`text-body ${item.done ? 'text-muted-foreground line-through' : ''}`}>
          {item.label}
        </span>
        {(item.minimum || item.monthlyProgress) && (
          <span className="text-small text-muted-foreground">
            {item.minimum}
            {item.minimum && item.monthlyProgress && ' · '}
            {item.monthlyProgress && (
              <span data-testid={`monthly-progress-${item.id}`}>
                {toArabicIndic(item.monthlyProgress.done)}/
                {toArabicIndic(item.monthlyProgress.target)} {WIRD_COPY.monthlyProgress}
              </span>
            )}
          </span>
        )}
      </span>
      {isPrayer && <PrayerTimeBadge prayerId={item.id} />}
      {item.targetToday && (
        <span className="shrink-0 rounded-chip border border-primary/40 bg-primary/10 px-2 py-0.5 text-label text-primary">
          {WIRD_COPY.targetToday}
        </span>
      )}
      {item.optional && (
        <span className="shrink-0 rounded-chip bg-gold-soft px-2 py-0.5 text-label text-gold">
          {WIRD_COPY.voluntary}
        </span>
      )}
    </button>
  )
}
