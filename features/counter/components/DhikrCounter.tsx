'use client'

import { Check } from 'lucide-react'

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
        'flex w-full items-center justify-between gap-3 rounded-card p-3 text-start transition-colors',
        done ? 'bg-primary/10' : 'bg-surface-2 hover:bg-surface-2/70',
      )}
    >
      <span className={cn('text-body', done && 'text-muted-foreground')}>{label}</span>
      {done ? (
        <span className="border-primary bg-primary text-on-primary flex size-6 items-center justify-center rounded-full border">
          <Check className="size-4" aria-hidden />
        </span>
      ) : (
        <span
          className="text-primary text-small tabular-nums"
          data-testid={`dhikr-count-${itemId}`}
        >
          {count}/{target}
        </span>
      )}
    </button>
  )
}
