type PrayerRescheduleListener = () => void

const listeners = new Set<PrayerRescheduleListener>()

export function requestPrayerReschedule(): void {
  for (const listener of listeners) listener()
}

export function subscribePrayerReschedule(listener: PrayerRescheduleListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
