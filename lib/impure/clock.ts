import { toDayId } from '@/lib/pure/day'
import type { DayId } from '@/types/wird'

// The one source of "now" for the app. Impure by design (reads the system clock); pure logic
// never calls these — a DayId or timestamp is passed in as a parameter instead. Isolating the
// clock here keeps everything downstream deterministic and testable.

export function now(): number {
  return Date.now()
}

export function today(): DayId {
  return toDayId(new Date())
}
