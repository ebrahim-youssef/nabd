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
