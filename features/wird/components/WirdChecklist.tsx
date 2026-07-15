'use client'

import { Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'

import { DhikrCounter } from '@/features/counter/components/DhikrCounter'
import { today } from '@/lib/impure/clock'
import { toArabicIndic } from '@/lib/pure/format'
import { cn } from '@/lib/utils'

import { useToggleItem } from '../hooks/useToggleItem'
import { useWirdChecklist } from '../hooks/useWirdChecklist'
import type { ChecklistAreaView, ChecklistItemView } from '../types'

// The daily wird checklist (NBD-7). Reads live from Dexie so a check-off survives an offline
// reload, and writes append-only entries on tap. The first version is seeded by onboarding
// (NBD-6), which gates this component — by the time it renders, a version exists.
// Areas render as accordions (NBD-21): open by default, header count stays live even when
// the body is collapsed.
export function WirdChecklist() {
  // Fix the day on mount so the live query key is stable for the session.
  const [day] = useState(() => today())
  const { areas, isLoading, versionId } = useWirdChecklist(day)
  const { toggle } = useToggleItem()
  // Collapsed area ids — everything starts open, so we track the exceptions.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())

  if (isLoading) {
    return <div className="bg-surface-2 h-40 w-full animate-pulse rounded-card" aria-hidden />
  }

  if (!versionId || areas.length === 0) {
    return <p className="text-muted-foreground text-body">لا يوجد وِرد بعد.</p>
  }

  const toggleArea = (areaId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(areaId)) next.delete(areaId)
      else next.add(areaId)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4" data-testid="wird-checklist">
      {areas.map((area) => {
        const isOpen = !collapsed.has(area.id)
        return (
          <section key={area.id} className="flex flex-col gap-2">
            <AreaHeader area={area} isOpen={isOpen} onToggle={() => toggleArea(area.id)} />
            {isOpen && (
              <ul className="flex flex-col gap-2" data-testid={`area-items-${area.id}`}>
                {area.items.map((item) => (
                  <li key={item.id}>
                    {item.kind === 'counter' && item.target ? (
                      <DhikrCounter
                        day={day}
                        versionId={versionId}
                        itemId={item.id}
                        label={item.label}
                        target={item.target}
                        done={item.done}
                      />
                    ) : (
                      <ChecklistRow
                        item={item}
                        onToggle={() => toggle(day, versionId, item.id, !item.done)}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

function AreaHeader({
  area,
  isOpen,
  onToggle,
}: {
  area: ChecklistAreaView
  isOpen: boolean
  onToggle: () => void
}) {
  const doneCount = area.items.filter((item) => item.done).length
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      data-testid={`area-header-${area.id}`}
      className="flex w-full items-center justify-between gap-3 rounded-card py-1 text-start"
    >
      <span className="flex items-center gap-2">
        <h2 className="font-display text-title text-primary">{area.label}</h2>
        <ChevronDown
          aria-hidden
          className={cn(
            'text-muted-foreground size-5 transition-transform',
            !isOpen && 'rotate-180',
          )}
        />
      </span>
      <span className="text-muted-foreground text-small" data-testid={`area-count-${area.id}`}>
        {toArabicIndic(doneCount)}/{toArabicIndic(area.items.length)}
      </span>
    </button>
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
