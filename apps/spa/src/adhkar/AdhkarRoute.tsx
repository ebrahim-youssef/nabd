import { Check, ChevronDown, RotateCcw } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'

import {
  ADHKAR_COPY,
  ADHKAR_LIBRARY,
  DAILY_CATEGORY_ID,
  LIST_CATEGORIES,
  STRIP_VISIBLE_COUNT,
  computeDailyItemState,
  toArabicIndic,
  toDayId,
  upcoming,
} from '@nabd/shared'
import type { AdhkarCategory, DayId } from '@nabd/shared'

import { PageHeader } from '../app/PageHeader'
import { useWirdChecklist } from '../wird/useWirdChecklist'
import { completeWirdItem } from './db'
import { useAdhkarFlow } from './useAdhkarFlow'

export function AdhkarRoute() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab')
  const selected = ADHKAR_LIBRARY.some((category) => category.id === requested)
    ? requested!
    : ADHKAR_LIBRARY[0].id
  const category = ADHKAR_LIBRARY.find((entry) => entry.id === selected) ?? ADHKAR_LIBRARY[0]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={ADHKAR_COPY.libraryTitle} backHref="/app/libraries" />
      <div className="flex flex-col gap-4" data-testid="adhkar-tabs">
        <div role="tablist" className="flex gap-2 overflow-x-auto pb-1">
          {ADHKAR_LIBRARY.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={entry.id === selected}
              data-testid={`adhkar-tab-${entry.id}`}
              onClick={() => setParams({ tab: entry.id })}
              className={`shrink-0 rounded-chip border px-4 py-1.5 text-small font-medium transition-all duration-200 ${entry.id === selected ? 'border-primary bg-primary text-on-primary shadow-card-small' : 'border-border bg-surface text-muted-foreground hover:border-accent/40 hover:text-primary'}`}
            >
              {entry.title}
            </button>
          ))}
        </div>
        {category.id === DAILY_CATEGORY_ID ? (
          <DailyAdhkarList category={category} />
        ) : LIST_CATEGORIES.has(category.id) ? (
          <IndependentList category={category} />
        ) : (
          <GuidedFlow category={category} />
        )}
      </div>
    </div>
  )
}

function GuidedFlow({ category }: { category: AdhkarCategory }) {
  const [day] = useState(() => toDayId(new Date()))
  const { state, tap, restart, markedInWird } = useAdhkarFlow(category.id, category.items, day)
  if (state.finished)
    return (
      <div
        className="pattern-khatam flex flex-col items-center gap-3 rounded-card p-6 text-center text-on-primary shadow-card"
        data-testid="flow-finished"
      >
        <p className="text-body font-medium">{ADHKAR_COPY.finished}</p>
        {markedInWird && (
          <p className="text-small opacity-90" data-testid="flow-marked">
            {ADHKAR_COPY.markedInWird}
          </p>
        )}
        <button
          type="button"
          onClick={restart}
          data-testid="flow-restart"
          className="flex items-center gap-2 rounded-card bg-surface px-4 py-2 text-body text-primary"
        >
          <RotateCcw className="size-4" aria-hidden />
          {ADHKAR_COPY.restart}
        </button>
      </div>
    )
  const active = category.items[state.index]
  return (
    <>
      <button
        type="button"
        onClick={tap}
        data-testid="flow-active-card"
        className="pattern-khatam flex w-full flex-col items-center gap-4 rounded-card p-6 text-center text-on-primary shadow-card active:scale-[0.99]"
      >
        <p className="font-scripture text-scripture">{active.text}</p>
        <span className="font-display text-display" data-testid="flow-count">
          {toArabicIndic(state.count)}
          <span className="text-title opacity-75">/{toArabicIndic(active.repeat)}</span>
        </span>
        <span
          aria-hidden
          className="block h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-ring-track"
        >
          <span
            className="block h-full rounded-full bg-gold transition-[inline-size] duration-200"
            style={{ inlineSize: `${Math.min((state.count / active.repeat) * 100, 100)}%` }}
          />
        </span>
        <span className="text-small opacity-75">{ADHKAR_COPY.tapHint}</span>
      </button>
      {upcoming(state, category.items, STRIP_VISIBLE_COUNT).length > 0 && (
        <ul className="flex touch-pan-x snap-x gap-3 overflow-x-auto pb-1" data-testid="flow-strip">
          {upcoming(state, category.items, STRIP_VISIBLE_COUNT).map((dhikr) => (
            <li
              key={dhikr.id}
              className="flex w-40 shrink-0 snap-start flex-col justify-between gap-2 rounded-card border border-border bg-surface p-3 shadow-card-small"
            >
              <p className="line-clamp-3 text-small text-muted-foreground">{dhikr.text}</p>
              <span className="self-start rounded-chip bg-gold-soft px-2 py-0.5 text-label font-medium text-gold">
                ×{toArabicIndic(dhikr.repeat)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <FullList category={category} />
    </>
  )
}

function IndependentList({ category }: { category: AdhkarCategory }) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  return (
    <ul className="flex flex-col gap-3" data-testid="adhkar-list">
      {category.items.map((dhikr) => {
        const count = counts[dhikr.id] ?? 0
        const done = count >= dhikr.repeat
        return (
          <li
            key={dhikr.id}
            data-testid={`list-item-${dhikr.id}`}
            className={`flex flex-col gap-3 rounded-card border p-4 ${done ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface shadow-card-small'}`}
          >
            <p className="font-scripture text-scripture text-foreground">{dhikr.text}</p>
            {dhikr.virtue && <p className="text-small text-muted-foreground">{dhikr.virtue}</p>}
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={done}
                onClick={() =>
                  setCounts((previous) => ({
                    ...previous,
                    [dhikr.id]: Math.min(count + 1, dhikr.repeat),
                  }))
                }
                data-testid={`list-count-${dhikr.id}`}
                className="flex grow items-center justify-center gap-2 rounded-card border border-primary/40 bg-primary/10 p-3 text-body font-medium text-primary"
              >
                <span>
                  {toArabicIndic(count)}/{toArabicIndic(dhikr.repeat)}
                </span>
                {done && (
                  <>
                    <Check className="size-4" aria-hidden />
                    <span>{ADHKAR_COPY.done}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                aria-label={ADHKAR_COPY.reset}
                data-testid={`list-reset-${dhikr.id}`}
                onClick={() => setCounts((previous) => ({ ...previous, [dhikr.id]: 0 }))}
                className="flex size-11 items-center justify-center rounded-card border border-border bg-surface text-muted-foreground"
              >
                <RotateCcw className="size-4" aria-hidden />
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function DailyAdhkarList({ category }: { category: AdhkarCategory }) {
  const [day] = useState(() => toDayId(new Date()))
  const { areas } = useWirdChecklist(day)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const items = new Map(areas.flatMap((area) => area.items.map((item) => [item.id, item] as const)))
  function bump(itemId: string, target: number, done: boolean, at: number) {
    if (done) return
    const current = computeDailyItemState(
      counts[itemId],
      items.get(itemId)?.target,
      items.get(itemId)?.done,
      target,
    ).count
    const next = Math.min(current + 1, target)
    setCounts((previous) => ({ ...previous, [itemId]: next }))
    if (next >= target) void completeWirdItem(day, itemId, at)
  }
  return (
    <ul className="flex flex-col gap-3" data-testid="daily-adhkar-list">
      {category.items.map((dhikr) => {
        const item = items.get(dhikr.id)
        const state = computeDailyItemState(
          counts[dhikr.id],
          item?.target,
          item?.done,
          dhikr.repeat,
        )
        return (
          <li
            key={dhikr.id}
            data-testid={`daily-item-${dhikr.id}`}
            className={`flex flex-col gap-3 rounded-card border p-4 ${state.done ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface shadow-card-small'}`}
          >
            <p className="font-scripture text-scripture text-foreground">{dhikr.text}</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={state.done}
                onClick={() => bump(dhikr.id, state.target, state.done, Date.now())}
                data-testid={`daily-count-${dhikr.id}`}
                className="flex grow items-center justify-center gap-2 rounded-card border border-primary/40 bg-primary/10 p-3 text-body font-medium text-primary"
              >
                <span>
                  {toArabicIndic(state.count)}/{toArabicIndic(state.target)}
                </span>
                {state.done && (
                  <>
                    <Check className="size-4" aria-hidden />
                    <span>{ADHKAR_COPY.done}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                aria-label={ADHKAR_COPY.reset}
                data-testid={`daily-reset-${dhikr.id}`}
                onClick={() => setCounts((previous) => ({ ...previous, [dhikr.id]: 0 }))}
                className="flex size-11 items-center justify-center rounded-card border border-border bg-surface text-muted-foreground"
              >
                <RotateCcw className="size-4" aria-hidden />
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function FullList({ category }: { category: AdhkarCategory }) {
  return (
    <details
      className="group rounded-card border border-border bg-surface shadow-card-small"
      data-testid="adhkar-full-list"
    >
      <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 text-body font-medium [&::-webkit-details-marker]:hidden">
        {ADHKAR_COPY.allSectionAdhkar} ({toArabicIndic(category.items.length)})
        <ChevronDown
          aria-hidden
          className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <ul className="flex flex-col gap-3 px-4 pb-4">
        {category.items.map((dhikr) => (
          <li
            key={dhikr.id}
            className="flex flex-col gap-2 rounded-card border border-border bg-surface-2/60 p-4"
          >
            <p className="font-scripture text-scripture text-foreground">{dhikr.text}</p>
            {dhikr.virtue && (
              <span className="text-small text-muted-foreground">{dhikr.virtue}</span>
            )}
          </li>
        ))}
      </ul>
    </details>
  )
}
