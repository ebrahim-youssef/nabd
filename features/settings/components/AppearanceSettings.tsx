'use client'

import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'

import { applyMode, readMode, type Mode } from '@/lib/impure/appearance'
import { cn } from '@/lib/utils'

const MODE_OPTIONS: { id: Mode; title: string; description: string }[] = [
  { id: 'classic', title: 'كلاسيكي', description: 'خطّ رقعة تراثيّ وزوايا هادئة.' },
  { id: 'modern', title: 'عصري', description: 'خطّ كوفيّ هندسيّ وزوايا أوضح.' },
]

// نمط العرض switcher (NBD-37): flips data-mode on <html> and persists it per device. The
// initial state is read after mount (localStorage is client-only), same deferral pattern as
// usePrayerTimes.
export function AppearanceSettings() {
  const [mode, setMode] = useState<Mode>('classic')

  useEffect(() => {
    // Deferred a tick: localStorage is client-only and the deferral keeps SSR markup and the
    // first client render identical (same pattern as usePrayerTimes).
    const timer = window.setTimeout(() => setMode(readMode()), 0)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <section className="flex flex-col gap-3" data-testid="appearance-settings">
      <h2 className="font-display text-title text-primary">نمط العرض</h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        {MODE_OPTIONS.map((option) => {
          const selected = option.id === mode
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              data-testid={`mode-${option.id}`}
              onClick={() => {
                applyMode(option.id)
                setMode(option.id)
              }}
              className={cn(
                'flex flex-1 flex-col gap-1 rounded-card border p-4 text-start transition-all duration-200',
                selected
                  ? 'border-primary bg-primary/10 shadow-card'
                  : 'border-border bg-surface shadow-card-sm hover:border-accent/40',
              )}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-display text-title text-primary">{option.title}</span>
                {selected && (
                  <span className="border-primary bg-primary text-on-primary animate-in zoom-in flex size-6 shrink-0 items-center justify-center rounded-full border-2 duration-200">
                    <Check className="size-4" aria-hidden />
                  </span>
                )}
              </span>
              <span className="text-muted-foreground text-body">{option.description}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
