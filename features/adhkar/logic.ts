import type { Dhikr } from '@/content/adhkar'

// Pure state machine for the guided adhkar flow (NBD-29, design-notes-r3 §4): one active
// dhikr counts taps toward its repeat target; completing it advances to the next; the strip
// below previews the upcoming three. No I/O, no React.

export type FlowState = {
  // Index of the active dhikr within the category's items.
  index: number
  // Taps so far on the active dhikr (0 … repeat).
  count: number
  // True once every dhikr in the category has been completed.
  finished: boolean
}

export const INITIAL_FLOW: FlowState = { index: 0, count: 0, finished: false }

// One tap on the active card. Reaching the active dhikr's repeat target auto-advances and
// resets the counter; finishing the last dhikr flags the flow finished.
export function tap(state: FlowState, items: Dhikr[]): FlowState {
  if (state.finished || items.length === 0) return state
  const active = items[state.index]
  const count = state.count + 1
  if (count < active.repeat) return { ...state, count }
  const nextIndex = state.index + 1
  if (nextIndex >= items.length) return { index: state.index, count: active.repeat, finished: true }
  return { index: nextIndex, count: 0, finished: false }
}

// The up-to-three upcoming adhkar shown in the strip (design: only three visible; the strip
// itself scrolls as items complete).
export function upcoming(state: FlowState, items: Dhikr[], visible: number): Dhikr[] {
  if (state.finished) return []
  return items.slice(state.index + 1, state.index + 1 + visible)
}

export type DailyItemState = {
  target: number
  count: number
  done: boolean
}

// Pure target and count resolution for the five daily adhkar cards (NBD-60).
// If a local tap count exists, it drives the count and done state. Otherwise,
// if the wird item is done today on home, the card seeds to full (count = target).
export function computeDailyItemState(
  localCount: number | undefined,
  wirdTarget: number | undefined,
  wirdDone: boolean | undefined,
  defaultRepeat: number,
): DailyItemState {
  const target = wirdTarget ?? defaultRepeat
  if (localCount !== undefined) {
    const count = Math.min(Math.max(0, localCount), target)
    return { target, count, done: count >= target }
  }
  const done = wirdDone ?? false
  return { target, count: done ? target : 0, done }
}
