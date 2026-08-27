import { SETTINGS_COPY } from '@nabd/shared'
import { Check } from 'lucide-react'
import { useState } from 'react'

import { applyMode, readMode } from '../app/appearance'
import type { Mode } from '../app/appearance'

const MODE_OPTIONS: { id: Mode; title: string; description: string }[] = [
  { id: 'classic', ...SETTINGS_COPY.appearance.classic },
  { id: 'modern', ...SETTINGS_COPY.appearance.modern },
]

// نمط العرض (NBD-37): flips `data-mode` on <html> and persists it per device. Unlike the Next.js
// original there is no deferred first read — the SPA has no server markup to match.
export function AppearanceSettings() {
  const [mode, setMode] = useState(() => readMode())

  return (
    <section className="flex flex-col gap-3" data-testid="appearance-settings">
      <h2 className="font-display text-title text-primary">{SETTINGS_COPY.appearance.title}</h2>
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
              className={`flex flex-1 flex-col gap-1 rounded-card border p-4 text-start transition-all duration-200 ${selected ? 'border-primary bg-primary/10 shadow-card' : 'border-border bg-surface shadow-card-small hover:border-accent/40'}`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-display text-title text-primary">{option.title}</span>
                {selected && (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary text-on-primary animate-in zoom-in duration-200">
                    <Check className="size-4" aria-hidden />
                  </span>
                )}
              </span>
              <span className="text-body text-muted-foreground">{option.description}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
