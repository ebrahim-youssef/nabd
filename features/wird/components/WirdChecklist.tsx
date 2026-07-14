'use client'

import { Check } from 'lucide-react'
import { useState } from 'react'

import { today } from '@/lib/impure/clock'
import { cn } from '@/lib/utils'

import { useToggleItem } from '../hooks/useToggleItem'
import { useWirdChecklist } from '../hooks/useWirdChecklist'
import type { ChecklistItemView } from '../types'

// The daily wird checklist (NBD-7). Reads live from Dexie so a check-off survives an offline
// reload, and writes append-only entries on tap.
export function WirdChecklist() {
  // Fix the day on mount so the live query key is stable for the session.
  const [day] = useState(() => today())
  const { areas, isLoading, versionId } = useWirdChecklist(day)
  const { toggle } = useToggleItem()

  if (isLoading) {
    return <div className="bg-surface-2 h-40 w-full animate-pulse rounded-card" aria-hidden />
  }

  if (!versionId || areas.length === 0) {
    return <p className="text-muted-foreground text-body">لا يوجد وِرد بعد.</p>
  }

  return (
    <div className="flex flex-col gap-6" data-testid="wird-checklist">
      {areas.map((area) => (
        <section key={area.id} className="flex flex-col gap-2">
          <h2 className="font-display text-title text-primary">{area.label}</h2>
          <ul className="flex flex-col gap-2">
            {area.items.map((item) => (
              <li key={item.id}>
                <ChecklistRow
                  item={item}
                  onToggle={() => toggle(day, versionId, item.id, !item.done)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function ChecklistRow({ item, onToggle }: { item: ChecklistItemView; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={item.done}
      onClick={onToggle}
      data-testid={`wird-item-${item.id}`}
      className={cn(
        'flex w-full items-center gap-3 rounded-card p-3 text-start transition-colors',
        item.done ? 'bg-primary/10' : 'bg-surface-2 hover:bg-surface-2/70',
      )}
    >
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full border',
          item.done ? 'border-primary bg-primary text-on-primary' : 'border-border',
        )}
      >
        {item.done && <Check className="size-4" aria-hidden />}
      </span>
      <span className={cn('text-body', item.done && 'text-muted-foreground line-through')}>
        {item.label}
      </span>
    </button>
  )
}
