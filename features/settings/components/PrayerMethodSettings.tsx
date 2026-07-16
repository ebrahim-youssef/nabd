'use client'

import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  applyCalculationMethodId,
  CALCULATION_METHODS,
  DEFAULT_METHOD_ID,
  readCalculationMethodId,
  type CalculationMethodId,
} from '@/lib/impure/prayer'
import { cn } from '@/lib/utils'

// طريقة حساب المواقيت picker (NBD-38): persists the adhan.js method per device and fires
// METHOD_EVENT so every mounted prayer-times consumer recomputes live.
export function PrayerMethodSettings() {
  const [methodId, setMethodId] = useState<CalculationMethodId>(DEFAULT_METHOD_ID)

  useEffect(() => {
    // Deferred a tick: localStorage is client-only and the deferral keeps SSR markup and the
    // first client render identical (same pattern as usePrayerTimes).
    const timer = window.setTimeout(() => setMethodId(readCalculationMethodId()), 0)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <section className="flex flex-col gap-3" data-testid="prayer-method-settings">
      <h2 className="font-display text-title text-primary">طريقة حساب المواقيت</h2>
      <ul className="flex flex-col gap-2">
        {CALCULATION_METHODS.map((method) => {
          const selected = method.id === methodId
          return (
            <li key={method.id}>
              <button
                type="button"
                aria-pressed={selected}
                data-testid={`method-${method.id}`}
                onClick={() => {
                  applyCalculationMethodId(method.id)
                  setMethodId(method.id)
                }}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-card border p-3 text-start transition-all duration-200',
                  selected
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-surface shadow-card-sm hover:border-accent/40',
                )}
              >
                <span className={cn('text-body', selected && 'text-primary font-medium')}>
                  {method.label}
                </span>
                {selected && (
                  <span className="border-primary bg-primary text-on-primary animate-in zoom-in flex size-6 shrink-0 items-center justify-center rounded-full border-2 duration-200">
                    <Check className="size-4" aria-hidden />
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
