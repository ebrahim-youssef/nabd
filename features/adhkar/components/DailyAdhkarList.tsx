'use client'

import { Check, RotateCcw } from 'lucide-react'
import { useState } from 'react'

import type { AdhkarCategory } from '@/content/adhkar'
import { useWirdChecklist } from '@/features/wird/hooks/useWirdChecklist'
import { today } from '@/lib/impure/clock'
import { toArabicIndic } from '@/lib/pure/format'
import { cn } from '@/lib/utils'

import { COPY } from '../constants'
import { useDailyAdhkar } from '../hooks/useDailyAdhkar'
import { computeDailyItemState } from '../logic'

export function DailyAdhkarList({ category }: { category: AdhkarCategory }) {
  const [day] = useState(() => today())
  const { areas } = useWirdChecklist(day)
  const { markItemDone } = useDailyAdhkar()
  const [counts, setCounts] = useState<Record<string, number>>({})

  // Flatten items from all areas of the checklist into a lookup map.
  const wirdItemsMap = new Map<string, { target?: number; done: boolean }>()
  for (const area of areas) {
    for (const item of area.items) {
      wirdItemsMap.set(item.id, { target: item.target, done: item.done })
    }
  }

  const bump = (id: string, target: number, isCurrentlyDone: boolean) => {
    if (isCurrentlyDone) return
    const wirdItem = wirdItemsMap.get(id)
    const current = computeDailyItemState(counts[id], wirdItem?.target, wirdItem?.done, 10).count
    const nextCount = Math.min(current + 1, target)

    setCounts((prev) => ({ ...prev, [id]: nextCount }))

    if (nextCount >= target && !wirdItem?.done) {
      void markItemDone(id)
    }
  }

  const reset = (id: string) => {
    setCounts((prev) => ({ ...prev, [id]: 0 }))
  }

  return (
    <ul className="flex flex-col gap-3" data-testid="daily-adhkar-list">
      {category.items.map((dhikr) => {
        const wirdItem = wirdItemsMap.get(dhikr.id)
        const { target, count, done } = computeDailyItemState(
          counts[dhikr.id],
          wirdItem?.target,
          wirdItem?.done,
          dhikr.repeat,
        )

        return (
          <li
            key={dhikr.id}
            data-testid={`daily-item-${dhikr.id}`}
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
                onClick={() => bump(dhikr.id, target, done)}
                disabled={done}
                data-testid={`daily-count-${dhikr.id}`}
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
                    data-testid={`daily-done-${dhikr.id}`}
                  />
                )}
                <span>
                  {toArabicIndic(count)}
                  <span className="opacity-70">/{toArabicIndic(target)}</span>
                </span>
                {done && <span>{COPY.done}</span>}
              </button>
              <button
                type="button"
                onClick={() => reset(dhikr.id)}
                aria-label={COPY.reset}
                data-testid={`daily-reset-${dhikr.id}`}
                className="border-border bg-surface text-muted-foreground hover:text-foreground flex size-11 shrink-0 items-center justify-center rounded-card border transition-colors"
              >
                <RotateCcw className="size-4.5" aria-hidden />
              </button>
            </div>

            {/* Repetition track (target > 1): the tap's effect is visible as motion. */}
            {target > 1 && (
              <span
                aria-hidden
                className="bg-ring-track block h-1.5 w-full overflow-hidden rounded-full"
              >
                <span
                  className="bg-gold block h-full rounded-full transition-[inline-size] duration-200"
                  style={{ inlineSize: `${Math.min((count / target) * 100, 100)}%` }}
                />
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
