import { isDayId } from '../lib/day'
import type { DayId } from '../wird/types'

export function resolveTodayDay(value: string | null | undefined): DayId | null {
  return value && isDayId(value) ? value : null
}
