export type DailyItemState = {
  target: number
  count: number
  done: boolean
}

const MIN_DAILY_TARGET = 1
const MIN_DAILY_COUNT = 0

function validTarget(value: number | undefined, fallback: number): number {
  return value !== undefined && Number.isFinite(value) && value >= MIN_DAILY_TARGET
    ? value
    : fallback
}

export function computeDailyItemState(
  localCount: number | undefined,
  wirdTarget: number | undefined,
  wirdDone: boolean | undefined,
  defaultRepeat: number,
): DailyItemState {
  const target = validTarget(wirdTarget, validTarget(defaultRepeat, MIN_DAILY_TARGET))
  if (localCount !== undefined && Number.isFinite(localCount)) {
    const count = Math.min(Math.max(MIN_DAILY_COUNT, localCount), target)
    return { target, count, done: count >= target }
  }
  const done = wirdDone === true
  return { target, count: done ? target : MIN_DAILY_COUNT, done }
}
