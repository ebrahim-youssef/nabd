'use client'

import { Check } from 'lucide-react'

import { toArabicIndic } from '@/lib/pure/format'
import { cn } from '@/lib/utils'
import type { DayId } from '@/types/wird'

import { useDhikrCounter } from '../hooks/useDhikrCounter'

type DhikrCounterProps = {
  day: DayId
  versionId: string
  itemId: string
  label: string
  target: number
  done: boolean
}

// A dhikr tap-counter row for the checklist. Tapping anywhere on the row counts one repetition;
// the count that hits the target marks the linked wird item done. Shows `count/target` until
// complete, then the done state.
export function DhikrCounter({ day, versionId, itemId, label, target, done }: DhikrCounterProps) {
  const { count, tap } = useDhikrCounter(day, versionId, itemId, target, done)

  return (
    <button
      type="button"
      onClick={tap}
      aria-pressed={done}
      data-testid={`dhikr-${itemId}`}
      className={cn(
        'relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-card border p-3 text-start transition-all duration-200 active:scale-[0.99]',
        done
          ? 'border-primary/20 bg-primary/10'
          : 'border-border bg-surface shadow-card-sm hover:border-accent/40',
      )}
    >
      <span className={cn('text-body', done && 'text-muted-foreground')}>{label}</span>
      {done ? (
        <span className="border-primary bg-primary text-on-primary flex size-6 shrink-0 items-center justify-center rounded-full border-2">
          <Check className="animate-in zoom-in size-4 duration-200" aria-hidden />
        </span>
      ) : (
        <span
          className="bg-primary/10 text-primary rounded-chip px-2.5 py-0.5 text-small shrink-0 font-medium tabular-nums"
          data-testid={`dhikr-count-${itemId}`}
        >
          {toArabicIndic(count)}/{toArabicIndic(target)}
        </span>
      )}
      {/* Tap-progress hairline: every tap visibly moves the row toward its target. */}
      {!done && count > 0 && (
        <span
          aria-hidden
          className="bg-accent absolute bottom-0 start-0 block h-0.5 rounded-full transition-[inline-size] duration-200"
          style={{ inlineSize: `${Math.min((count / target) * 100, 100)}%` }}
        />
      )}
    </button>
  )
}
