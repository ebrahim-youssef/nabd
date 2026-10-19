import { monthOf, nextDay, weekdayOf } from '../lib/day'
import { isScheduledOn, latestStateByItem } from '../lib/wird'
import type {
  ChecklistAreaView,
  ChecklistItemView,
  DayId,
  TodaySummary,
  WirdDefinition,
  WirdEntry,
  WirdVersion,
} from './types'

export type WirdLevelDefinition = { wird: WirdDefinition }

export type VersionHealingPlan = {
  definition: WirdDefinition
  effectiveFrom: DayId
}

export function monthlyDoneDays(entries: WirdEntry[], itemId: string, month: string): number {
  const latestByDay = new Map<string, { at: number; done: boolean }>()
  for (const entry of entries) {
    if (entry.itemId !== itemId || monthOf(entry.day) !== month) continue
    const seen = latestByDay.get(entry.day)
    if (!seen || entry.at > seen.at) latestByDay.set(entry.day, { at: entry.at, done: entry.done })
  }
  let done = 0
  for (const state of latestByDay.values()) if (state.done) done += 1
  return done
}

export function levelMatching<L extends { wird: WirdDefinition }>(
  definition: WirdDefinition,
  levels: L[],
): L | null {
  const target = definition.items.find((item) => item.kind === 'counter')?.target
  if (target === undefined) return null
  return (
    levels.find((level) =>
      level.wird.items.some((item) => item.kind === 'counter' && item.target === target),
    ) ?? null
  )
}

export function sameDefinition(a: WirdDefinition, b: WirdDefinition): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function buildChecklist(
  definition: WirdDefinition,
  entries: WirdEntry[],
  day: DayId,
  monthEntries: WirdEntry[] = [],
): ChecklistAreaView[] {
  const state = latestStateByItem(entries)
  const month = monthOf(day)
  return [...definition.areas]
    .sort((a, b) => a.order - b.order)
    .map((area) => ({
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
              ? {
                  done: monthlyDoneDays(monthEntries, item.id, month),
                  target: item.schedule.target,
                }
              : undefined,
          targetToday: item.targetDays ? item.targetDays.includes(weekdayOf(day)) : undefined,
        })),
    }))
}

export function areaProgress(area: ChecklistAreaView): {
  counted: ChecklistItemView[]
  doneCount: number
  complete: boolean
  progress: number
} {
  const required = area.items.filter((item) => !item.optional)
  const counted = required.length > 0 ? required : area.items
  const doneCount = counted.filter((item) => item.done).length
  const complete = counted.length > 0 && doneCount === counted.length
  const progress = counted.length > 0 ? (doneCount / counted.length) * 100 : 0
  return { counted, doneCount, complete, progress }
}

export function summarizeChecklist(areas: ChecklistAreaView[]): TodaySummary {
  const required = areas.flatMap((area) => area.items.filter((item) => !item.optional))
  const voluntary = areas.flatMap((area) => area.items.filter((item) => item.optional))
  return {
    total: required.length,
    done: required.filter((item) => item.done).length,
    remaining: required.filter((item) => !item.done).length,
    voluntary: { total: voluntary.length, done: voluntary.filter((item) => item.done).length },
  }
}

export function planVersionHealing(
  current: WirdVersion | null,
  levels: WirdLevelDefinition[],
  today: DayId,
): VersionHealingPlan | null {
  if (!current) return null

  const level = levelMatching(current.definition, levels)
  if (!level || sameDefinition(current.definition, level.wird)) return null

  return {
    definition: level.wird,
    effectiveFrom: nextDay(today),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function isWeekday(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 6
}

function isSchedule(value: unknown): boolean {
  if (value === undefined) return true
  if (!isRecord(value)) return false
  if (value.type === 'daily') return true
  if (value.type === 'monthly-goal') return isPositiveInteger(value.target)
  return value.type === 'weekdays' && Array.isArray(value.days) && value.days.every(isWeekday)
}

export function parseDefinition(source: string): WirdDefinition | null {
  try {
    const value: unknown = JSON.parse(source)
    if (!isRecord(value) || !Array.isArray(value.areas) || !Array.isArray(value.items)) return null
    const validAreas = value.areas.every(
      (area) =>
        isRecord(area) &&
        typeof area.id === 'string' &&
        typeof area.label === 'string' &&
        typeof area.order === 'number' &&
        Number.isFinite(area.order),
    )
    const areaIds = new Set(
      value.areas.filter(isRecord).map((area) => (typeof area.id === 'string' ? area.id : '')),
    )
    const validItems = value.items.every((item) => {
      if (
        !isRecord(item) ||
        typeof item.id !== 'string' ||
        typeof item.areaId !== 'string' ||
        !areaIds.has(item.areaId) ||
        typeof item.label !== 'string' ||
        (item.kind !== 'checkbox' && item.kind !== 'counter') ||
        !isSchedule(item.schedule)
      ) {
        return false
      }
      if (item.kind === 'counter' && !isPositiveInteger(item.target)) return false
      if (item.target !== undefined && !isPositiveInteger(item.target)) return false
      if (item.optional !== undefined && typeof item.optional !== 'boolean') return false
      if (item.minimum !== undefined && typeof item.minimum !== 'string') return false
      return (
        item.targetDays === undefined ||
        (Array.isArray(item.targetDays) && item.targetDays.every(isWeekday))
      )
    })
    const itemIds = new Set(value.items.filter(isRecord).map((item) => item.id))
    return validAreas &&
      areaIds.size === value.areas.length &&
      validItems &&
      itemIds.size === value.items.length
      ? (value as WirdDefinition)
      : null
  } catch {
    return null
  }
}
