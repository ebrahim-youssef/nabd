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
  hasEntriesToday: boolean,
): VersionHealingPlan | null {
  if (!current) return null

  const level = levelMatching(current.definition, levels)
  if (!level || sameDefinition(current.definition, level.wird)) return null

  return {
    definition: level.wird,
    effectiveFrom: hasEntriesToday ? nextDay(today) : today,
  }
}
