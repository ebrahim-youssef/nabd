import type { NotificationMoment } from '@nabd/shared'

export const NOTIFICATION_PREFS_KEY = 'nabd:notification-prefs'
export const NOTIFICATION_PREFS_EVENT = 'nabd:notification-prefs'
export const NOTIFICATION_FIRED_PREFIX = 'nabd:notification-fired'

// Keyed by the day the plan was drawn up for, not the day the moment itself falls on. Those are
// usually the same day and, on a device whose clock sits far from its coordinates, sometimes not:
// a local day's prayer times can land on the calendar day either side of it. Pruning keeps the
// planning day and discards the rest, so a marker keyed the other way would be thrown out from
// under a moment that had already fired, taking the once-a-day guarantee with it.
export function notificationMomentMarker(moment: NotificationMoment, dayId: string): string {
  return `${NOTIFICATION_FIRED_PREFIX}:${dayId}:${moment.kind}:${moment.prayerId}`
}

// Markers only ever answer "did today's moment already fire", so yesterday's are dead weight. Left
// alone they accumulate about twenty keys a day for the life of the browser profile.
export function staleMarkerKeys(keys: readonly string[], today: string): string[] {
  const livePrefix = `${NOTIFICATION_FIRED_PREFIX}:${today}:`
  return keys.filter(
    (key) => key.startsWith(`${NOTIFICATION_FIRED_PREFIX}:`) && !key.startsWith(livePrefix),
  )
}

type DeliveryDecision = {
  moment: NotificationMoment
  now: number
  visible: boolean
  alreadyFired: boolean
}

// A browser timeout is advisory only: visibility changes can throttle it. The wall clock decides
// whether the callback may deliver, keeping a hidden tab from emitting stale reminders on return.
export function shouldDeliverMoment({
  moment,
  now,
  visible,
  alreadyFired,
}: DeliveryDecision): boolean {
  return visible && !alreadyFired && now >= moment.at
}
