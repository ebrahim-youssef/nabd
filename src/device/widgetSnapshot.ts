import { buildDayPlan } from '../day-plan/logic'
import type { DayPrayerTimes } from '../prayer-times/logic'
import type { DayId, WirdDefinition, WirdEntry } from '../wird/types'

const MAX_WIDGET_ITEMS_PER_BLOCK = 3
const PRAYER_IDS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

export type WidgetSnapshotItem = {
  id: string
  label: string
  done: boolean
  countsAsUnrecorded: boolean
}

export type WidgetSnapshotBlock = {
  id: (typeof PRAYER_IDS)[number]
  label: string
  startsAt: number
  endsAt: number
  items: WidgetSnapshotItem[]
}

export type WidgetSnapshotPrayer = { id: (typeof PRAYER_IDS)[number]; label: string; at: number }

export type WidgetSnapshot = {
  schemaVersion: 1
  generatedAt: number
  day: DayId
  versionId: string
  blocks: WidgetSnapshotBlock[]
  nextPrayers: WidgetSnapshotPrayer[]
  unrecordedCount: number
  writeFailed: false
}

export type BuildWidgetSnapshotInput = {
  now: number
  day: DayId
  versionId: string | null
  times: DayPrayerTimes | null
  nextFajr: number | null
  definition: WirdDefinition
  entries: WirdEntry[]
}

export function buildWidgetSnapshot(input: BuildWidgetSnapshotInput): WidgetSnapshot | null {
  if (!input.versionId) return null
  const plan = buildDayPlan({
    now: input.now,
    day: input.day,
    times: input.times,
    nextFajr: input.nextFajr,
    definition: input.definition,
    entries: input.entries,
  })
  if (!plan.hasTimes || plan.blocks.some(({ window }) => window === null)) return null

  const countsAsUnrecordedIds = new Set(plan.unrecorded.map(({ id }) => id))
  for (const { window, items } of [...plan.blocks, ...plan.timedActs]) {
    if (!window) continue
    // Home counts only required items whose window has ended; an open window is not unrecorded yet.
    if (window.end <= input.now) {
      items.filter(({ optional }) => !optional).forEach(({ id }) => countsAsUnrecordedIds.add(id))
    }
  }

  const blocks: WidgetSnapshotBlock[] = []
  for (const block of plan.blocks) {
    const window = block.window
    if (!window) return null
    blocks.push({
      id: block.id,
      label: block.label,
      startsAt: window.start,
      endsAt: window.end,
      items: block.items.slice(0, MAX_WIDGET_ITEMS_PER_BLOCK).map(({ id, label, done }) => ({
        id,
        label,
        done,
        countsAsUnrecorded: countsAsUnrecordedIds.has(id),
      })),
    })
  }
  const prayerLabels = new Map(plan.blocks.map(({ id, label }) => [id, label]))
  const nextPrayers = PRAYER_IDS.flatMap((id) => {
    const at = input.times?.[id]
    const label = prayerLabels.get(id)
    if (at === undefined || at <= input.now || !label) return []
    return [{ id, label, at }]
  })
  if (input.nextFajr !== null && input.nextFajr > input.now) {
    const label = prayerLabels.get('fajr')
    if (!label) return null
    nextPrayers.push({ id: 'fajr', label, at: input.nextFajr })
  }
  nextPrayers.sort((first, second) => first.at - second.at)

  return {
    schemaVersion: 1,
    generatedAt: input.now,
    day: input.day,
    versionId: input.versionId,
    blocks,
    nextPrayers,
    unrecordedCount: plan.unrecorded.length,
    writeFailed: false,
  }
}
