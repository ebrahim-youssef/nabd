import { create } from 'zustand'

// UI-only state for active dhikr tap-sessions: the running count per counter item. This is
// ephemeral session state (ADR-0002: stores hold UI state only) — the durable "item complete"
// fact is a WirdEntry in Dexie, written when a counter reaches its target. Never mirror Dexie
// data here.
type CounterState = {
  counts: Record<string, number>
  increment: (itemId: string) => void
  reset: (itemId: string) => void
}

export const useCounterStore = create<CounterState>((set) => ({
  counts: {},
  increment: (itemId) =>
    set((state) => ({ counts: { ...state.counts, [itemId]: (state.counts[itemId] ?? 0) + 1 } })),
  reset: (itemId) =>
    set((state) => {
      const counts = { ...state.counts }
      delete counts[itemId]
      return { counts }
    }),
}))
