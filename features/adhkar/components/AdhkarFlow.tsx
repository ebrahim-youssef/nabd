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
        className="pattern-khatam text-on-primary shadow-card animate-in fade-in zoom-in-95 flex flex-col items-center gap-3 rounded-card p-6 text-center duration-300"
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
        className="pattern-khatam text-on-primary shadow-card flex flex-col items-center gap-4 rounded-card p-6 text-center transition-transform active:scale-[0.99]"
      >
        <p className="font-scripture text-scripture">{active.text}</p>
        <span className="font-display text-display" data-testid="flow-count">
          {toArabicIndic(state.count)}
          <span className="text-title opacity-75">/{toArabicIndic(active.repeat)}</span>
        </span>
        {/* Repetition track: the tap's effect is visible as motion, not just a number. */}
        <span
          aria-hidden
          className="bg-ring-track block h-1.5 w-full max-w-56 overflow-hidden rounded-full"
        >
          <span
            className="bg-gold block h-full rounded-full transition-[inline-size] duration-200"
            style={{ inlineSize: `${Math.min((state.count / active.repeat) * 100, 100)}%` }}
          />
        </span>
        <span className="text-small opacity-75">{COPY.tapHint}</span>
      </button>

      {nextUp.length > 0 && (
        <ul className="flex touch-pan-x snap-x gap-3 overflow-x-auto pb-1" data-testid="flow-strip">
          {nextUp.map((dhikr) => (
            <li
              key={dhikr.id}
              className="border-border bg-surface shadow-card-sm flex w-40 shrink-0 snap-start flex-col justify-between gap-2 rounded-card border p-3"
              data-testid={`flow-next-${dhikr.id}`}
            >
              <p className="text-small text-muted-foreground line-clamp-3">{dhikr.text}</p>
              <span className="bg-gold-soft text-gold rounded-chip self-start px-2 py-0.5 text-label font-medium">
                ×{toArabicIndic(dhikr.repeat)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
