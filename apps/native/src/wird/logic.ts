import { levelMatching, nextDay, sameDefinition } from '@nabd/shared'
import type { DayId, WirdDefinition, WirdVersion } from '@nabd/shared'

export type WirdLevelDefinition = { wird: WirdDefinition }

export type VersionHealingPlan = {
  definition: WirdDefinition
  effectiveFrom: DayId
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
