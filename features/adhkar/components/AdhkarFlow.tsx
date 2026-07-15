'use client'

import { RotateCcw } from 'lucide-react'

import type { AdhkarCategory } from '@/content/adhkar'
import { Button } from '@/components/ui/button'
import { toArabicIndic } from '@/lib/pure/format'

import { COPY, STRIP_VISIBLE_COUNT } from '../constants'
import { upcoming } from '../logic'
import { useAdhkarFlow } from '../hooks/useAdhkarFlow'

// The guided counter flow for one category (NBD-29, design-notes-r3 §4): a deep-teal active
// card counts taps toward the dhikr's target and auto-advances; below it a strip previews
// the next three (the strip scrolls, the page doesn't grow with it).
export function AdhkarFlow({ category }: { category: AdhkarCategory }) {
  const { state, tap, restart, markedInWird } = useAdhkarFlow(category.id, category.items)

  if (state.finished) {
    return (
      <div
        className="bg-primary text-on-primary flex flex-col items-center gap-3 rounded-card p-6 text-center"
        data-testid="flow-finished"
      >
        <p className="text-body font-medium">{COPY.finished}</p>
        {markedInWird && (
          <p className="text-small opacity-90" data-testid="flow-marked">
            {COPY.markedInWird}
          </p>
        )}
        <Button variant="secondary" onClick={restart} data-testid="flow-restart">
          <RotateCcw className="size-4" aria-hidden />
          {COPY.restart}
        </Button>
      </div>
    )
  }

  const active = category.items[state.index]
  const nextUp = upcoming(state, category.items, STRIP_VISIBLE_COUNT)

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={tap}
        data-testid="flow-active-card"
        className="bg-primary text-on-primary flex flex-col items-center gap-4 rounded-card p-6 text-center transition-transform active:scale-[0.99]"
      >
        <p className="font-scripture text-scripture">{active.text}</p>
        <span className="font-display text-display" data-testid="flow-count">
          {toArabicIndic(state.count)}
          <span className="text-title opacity-75">/{toArabicIndic(active.repeat)}</span>
        </span>
        <span className="text-small opacity-75">{COPY.tapHint}</span>
      </button>

      {nextUp.length > 0 && (
        <ul className="flex touch-pan-x snap-x gap-3 overflow-x-auto pb-1" data-testid="flow-strip">
          {nextUp.map((dhikr) => (
            <li
              key={dhikr.id}
              className="bg-surface-2 w-40 shrink-0 snap-start rounded-card p-3"
              data-testid={`flow-next-${dhikr.id}`}
            >
              <p className="text-small text-foreground line-clamp-3">{dhikr.text}</p>
              <span className="text-gold text-label font-medium">
                ×{toArabicIndic(dhikr.repeat)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
