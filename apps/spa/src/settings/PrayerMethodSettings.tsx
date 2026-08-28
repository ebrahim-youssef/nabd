import { CALCULATION_METHODS, SETTINGS_COPY } from '@nabd/shared'
import { Check } from 'lucide-react'
import { useState } from 'react'

import { applyCalculationMethodId, readCalculationMethodId } from '../prayer-times/prayerMethod'

// طريقة حساب المواقيت (NBD-38): persists the adhan.js method per device and fires METHOD_EVENT, so
// every mounted prayer-times consumer recomputes without a remount. This is the half of golden
// journey 8 the prayer-times slice could not close, because the picker lives here.
export function PrayerMethodSettings() {
  const [methodId, setMethodId] = useState(() => readCalculationMethodId())

  return (
    <section className="flex flex-col gap-3" data-testid="prayer-method-settings">
      <h2 className="font-display text-title text-primary">{SETTINGS_COPY.prayerMethod.title}</h2>
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
                className={`flex w-full items-center justify-between gap-3 rounded-card border p-3 text-start transition-all duration-200 ${selected ? 'border-primary bg-primary/10' : 'border-border bg-surface shadow-card-small hover:border-accent/40'}`}
              >
                <span className={`text-body ${selected ? 'font-medium text-primary' : ''}`}>
                  {method.label}
                </span>
                {selected && (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary text-on-primary animate-in zoom-in duration-200">
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
