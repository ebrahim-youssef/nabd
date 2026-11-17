// One point on the day's prayer timeline (فجر، شروق، ظهر، …) at an epoch-ms instant.
export type TimePoint = {
  id: string
  label: string
  at: number
}

// What the live sub-header says right now: within the window after a time point it announces
// it (أذّن الظهر منذ …); otherwise it counts down to the next one (باقي … على العصر).
export type TimelineStatus =
  | { kind: 'since'; point: TimePoint; minutes: number }
  | { kind: 'until'; point: TimePoint; ms: number }
  | null
