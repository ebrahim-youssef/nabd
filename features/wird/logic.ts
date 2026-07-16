import { isScheduledOn, latestStateByItem, monthlyDoneDays, versionInForce } from '@/lib/pure/wird'
import { monthOf } from '@/lib/pure/day'
import type { DayId, WirdDefinition, WirdEntry } from '@/types/wird'

import type { ChecklistAreaView, TodaySummary } from './types'

// Wird-specific pure logic: turning a definition + a day's entries into the checklist view.
// The shared resolution helpers (versionInForce, latestStateByItem, schedule helpers) live in
// @/lib/pure/wird so the statistics feature can reuse them too.
export { latestStateByItem, versionInForce }

// Resolves a wird definition + a day's entries into the grouped, ordered checklist view.
// `day` drives the ADR-0008 schedule filter (weekdays items exist only on their days);
// `monthEntries` — that month's entries for all items — feeds monthly-goal progress.
export function buildChecklist(
  definition: WirdDefinition,
  entries: WirdEntry[],
  day: DayId,
  monthEntries: WirdEntry[] = [],
): ChecklistAreaView[] {
  const state = latestStateByItem(entries)
  const month = monthOf(day)
  const areas = [...definition.areas].sort((a, b) => a.order - b.order)
  return areas.map((area) => ({
    id: area.id,
    label: area.label,
    order: area.order,
    items: definition.items
      .filter((item) => item.areaId === area.id && isScheduledOn(item, day))
      .map((item) => ({
        id: item.id,
        label: item.label,
        kind: item.kind,
        target: item.target,
        done: state.get(item.id) ?? false,
        optional: item.optional,
        minimum: item.minimum,
        monthlyProgress:
          item.schedule?.type === 'monthly-goal'
            ? { done: monthlyDoneDays(monthEntries, item.id, month), target: item.schedule.target }
            : undefined,
      })),
  }))
}

// Rolls the resolved checklist up into today's counts (NBD-10). Required items drive
// done/remaining (and the ring); optional (تطوّع) items are tallied separately so skipping
// them never reads as failure (ADR-0008). Derived from the same view the checklist renders,
// so the summary can never disagree with it.
export function summarizeChecklist(areas: ChecklistAreaView[]): TodaySummary {
  let total = 0
  let done = 0
  let voluntaryTotal = 0
  let voluntaryDone = 0
  for (const area of areas) {
    for (const item of area.items) {
      if (item.optional) {
        voluntaryTotal += 1
        if (item.done) voluntaryDone += 1
      } else {
        total += 1
        if (item.done) done += 1
      }
    }
  }
  return {
    total,
    done,
    remaining: total - done,
    voluntary: { total: voluntaryTotal, done: voluntaryDone },
  }
}
