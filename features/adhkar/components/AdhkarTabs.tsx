'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { ADHKAR_LIBRARY } from '@/content/adhkar'
import { toArabicIndic } from '@/lib/pure/format'
import { cn } from '@/lib/utils'

import { AdhkarFlow } from './AdhkarFlow'

// The adhkar page as tabs (NBD-29, design-notes-r3 §4): one tab per category; each tab runs
// the guided counter flow with the full reference list underneath. `?tab=<id>` deep-links a
// category (the wird checklist links here).
export function AdhkarTabs() {
  const searchParams = useSearchParams()
  const requested = searchParams.get('tab')
  const [selected, setSelected] = useState<string>(
    ADHKAR_LIBRARY.some((category) => category.id === requested)
      ? (requested as string)
      : ADHKAR_LIBRARY[0].id,
  )

  const category = ADHKAR_LIBRARY.find((entry) => entry.id === selected) ?? ADHKAR_LIBRARY[0]

  return (
    <div className="flex flex-col gap-4" data-testid="adhkar-tabs">
      <div role="tablist" className="flex gap-2 overflow-x-auto pb-1">
        {ADHKAR_LIBRARY.map((entry) => {
          const active = entry.id === selected
          return (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSelected(entry.id)}
              data-testid={`adhkar-tab-${entry.id}`}
              className={cn(
                'shrink-0 rounded-chip px-4 py-1.5 text-small font-medium transition-colors',
                active ? 'bg-primary text-on-primary' : 'bg-surface-2 text-muted-foreground',
              )}
            >
              {entry.title}
            </button>
          )
        })}
      </div>

      <AdhkarFlow key={category.id} category={category} />

      <details className="group bg-surface-2 rounded-card" data-testid="adhkar-full-list">
        <summary className="cursor-pointer list-none p-4 text-body font-medium">
          كل أذكار القسم ({toArabicIndic(category.items.length)})
        </summary>
        <ul className="flex flex-col gap-3 px-4 pb-4">
          {category.items.map((dhikr) => (
            <li key={dhikr.id} className="bg-surface flex flex-col gap-2 rounded-card p-4">
              <p className="font-scripture text-scripture text-foreground">{dhikr.text}</p>
              <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-small">
                {dhikr.repeat > 1 && (
                  <span className="text-gold shrink-0 font-medium">
                    ×{toArabicIndic(dhikr.repeat)}
                  </span>
                )}
                {dhikr.virtue && <span>{dhikr.virtue}</span>}
              </div>
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}
