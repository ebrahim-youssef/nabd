import { latestStateByItem, versionInForce } from '@/lib/pure/wird'
import type { WirdDefinition, WirdEntry } from '@/types/wird'

import type { ChecklistAreaView, TodaySummary } from './types'

// Wird-specific pure logic: turning a definition + a day's entries into the checklist view.
// The shared resolution helpers (versionInForce, latestStateByItem) live in @/lib/pure/wird so
// the statistics feature can reuse them too.
export { latestStateByItem, versionInForce }

// Resolves a wird definition + a day's entries into the grouped, ordered checklist view.
export function buildChecklist(
  definition: WirdDefinition,
  entries: WirdEntry[],
): ChecklistAreaView[] {
  const state = latestStateByItem(entries)
  const areas = [...definition.areas].sort((a, b) => a.order - b.order)
  return areas.map((area) => ({
    id: area.id,
    label: area.label,
    order: area.order,
    items: definition.items
      .filter((item) => item.areaId === area.id)
      .map((item) => ({
        id: item.id,
        label: item.label,
        kind: item.kind,
        target: item.target,
        done: state.get(item.id) ?? false,
      })),
  }))
}

// Rolls the resolved checklist up into today's done/remaining counts (NBD-10). Derived from the
// same view the checklist renders, so the summary can never disagree with it.
export function summarizeChecklist(areas: ChecklistAreaView[]): TodaySummary {
  let total = 0
  let done = 0
  for (const area of areas) {
    for (const item of area.items) {
      total += 1
      if (item.done) done += 1
    }
  }
  return { total, done, remaining: total - done }
}
