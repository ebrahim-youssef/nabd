import { Check } from 'lucide-react'

import { toArabicIndic } from '@nabd/shared'
import type { DayId } from '@nabd/shared'

import { useDhikrCounter } from './useDhikrCounter'

type DhikrCounterProps = {
  day: DayId
  itemId: string
  label: string
  target: number
  done: boolean
}

export function DhikrCounter({ day, itemId, label, target, done }: DhikrCounterProps) {
  const { count, tap } = useDhikrCounter(day, itemId, target, done)

  return (
    <button
      type="button"
      onClick={() => void tap()}
      aria-pressed={done}
      data-testid={`dhikr-${itemId}`}
      className={`relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-card border p-3 text-start transition-all duration-200 active:scale-[0.99] ${
        done
          ? 'border-primary/20 bg-primary/10'
          : 'border-border bg-surface shadow-card-small hover:border-accent/40'
      }`}
    >
      <span className={`text-body ${done ? 'text-muted-foreground' : ''}`}>{label}</span>
      {done ? (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-icon border-2 border-primary bg-primary text-on-primary">
          <Check className="size-4 animate-in zoom-in duration-200" aria-hidden />
        </span>
      ) : (
        <span
          className="shrink-0 rounded-chip bg-primary/10 px-2.5 py-0.5 text-small font-medium tabular-nums text-primary"
          data-testid={`dhikr-count-${itemId}`}
        >
          {toArabicIndic(count)}/{toArabicIndic(target)}
        </span>
      )}
      {!done && count > 0 && (
        <span
          aria-hidden
          className="absolute bottom-0 start-0 block h-0.5 rounded-icon bg-accent transition-[inline-size] duration-200"
          style={{ inlineSize: `${Math.min((count / target) * 100, 100)}%` }}
        />
      )}
    </button>
  )
}
