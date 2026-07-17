'use client'

import { Check, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import type { AdhkarCategory } from '@/content/adhkar'
import { toArabicIndic } from '@/lib/pure/format'
import { cn } from '@/lib/utils'

import { COPY } from '../constants'

// Independent per-dhikr counter list (NBD-52, r6 §4) for the repeatable categories
// (بعد الصلاة، النوم): every dhikr is its own card with its own tap counter and a reset —
// no guided flow, no auto-advance, no completion celebration. Counts are in-memory: these
// categories reset on every visit by design (their record was never the tap count).
export function AdhkarList({ category }: { category: AdhkarCategory }) {
  const [counts, setCounts] = useState<Record<string, number>>({})

  const bump = (id: string, repeat: number) =>
    setCounts((prev) => ({ ...prev, [id]: Math.min((prev[id] ?? 0) + 1, repeat) }))
  const reset = (id: string) => setCounts((prev) => ({ ...prev, [id]: 0 }))

  return (
    <ul className="flex flex-col gap-3" data-testid="adhkar-list">
      {category.items.map((dhikr) => {
        const count = counts[dhikr.id] ?? 0
        const done = count >= dhikr.repeat
        return (
          <li
            key={dhikr.id}
            data-testid={`list-item-${dhikr.id}`}
            className={cn(
              'flex flex-col gap-3 rounded-card border p-4 transition-colors',
              done ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface shadow-card-sm',
            )}
          >
            <p className="font-scripture text-scripture text-foreground">{dhikr.text}</p>
            {dhikr.virtue && <p className="text-muted-foreground text-small">{dhikr.virtue}</p>}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => bump(dhikr.id, dhikr.repeat)}
                disabled={done}
                data-testid={`list-count-${dhikr.id}`}
                className={cn(
                  'flex grow items-center justify-center gap-2 rounded-card border p-3 text-body font-medium tabular-nums transition-colors',
                  done
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-on-primary',
                )}
              >
                {done && (
                  <Check
                    className="size-4.5 shrink-0"
                    aria-hidden
                    data-testid={`list-done-${dhikr.id}`}
                  />
                )}
                <span>
                  {toArabicIndic(count)}
                  <span className="opacity-70">/{toArabicIndic(dhikr.repeat)}</span>
                </span>
                {done && <span>{COPY.done}</span>}
              </button>
              <button
                type="button"
                onClick={() => reset(dhikr.id)}
                aria-label={COPY.reset}
                data-testid={`list-reset-${dhikr.id}`}
                className="border-border bg-surface text-muted-foreground hover:text-foreground flex size-11 shrink-0 items-center justify-center rounded-card border transition-colors"
              >
                <RotateCcw className="size-4.5" aria-hidden />
              </button>
            </div>

            {/* Repetition track (repeat > 1): the tap's effect is visible as motion. */}
            {dhikr.repeat > 1 && (
              <span
                aria-hidden
                className="bg-ring-track block h-1.5 w-full overflow-hidden rounded-full"
              >
                <span
                  className="bg-gold block h-full rounded-full transition-[inline-size] duration-200"
                  style={{ inlineSize: `${Math.min((count / dhikr.repeat) * 100, 100)}%` }}
                />
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
