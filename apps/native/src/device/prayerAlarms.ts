export type PrayerAlarmSyncOutcome = 'ok' | 'failed'

type PrayerRescheduleListener = () => void
type PrayerAlarmSyncOutcomeListener = (outcome: PrayerAlarmSyncOutcome) => void

const listeners = new Set<PrayerRescheduleListener>()
const syncOutcomeListeners = new Set<PrayerAlarmSyncOutcomeListener>()
let lastSyncOutcome: PrayerAlarmSyncOutcome = 'ok'

export function requestPrayerReschedule(): void {
  for (const listener of listeners) listener()
}

export function subscribePrayerReschedule(listener: PrayerRescheduleListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getPrayerAlarmSyncOutcome(): PrayerAlarmSyncOutcome {
  return lastSyncOutcome
}

export function setPrayerAlarmSyncOutcome(outcome: PrayerAlarmSyncOutcome): void {
  lastSyncOutcome = outcome
  for (const listener of syncOutcomeListeners) listener(outcome)
}

export function subscribePrayerAlarmSyncOutcome(
  listener: PrayerAlarmSyncOutcomeListener,
): () => void {
  syncOutcomeListeners.add(listener)
  return () => {
    syncOutcomeListeners.delete(listener)
  }
}
