import { toDayId } from '@nabd/shared'
import type { NotificationMoment } from '@nabd/shared'

export type NotificationPrefs = {
  enabled: boolean
  beforeAdhan: boolean
  atAdhan: boolean
  atIqamah: boolean
  morningAdhkar: boolean
  eveningAdhkar: boolean
}

export const NOTIFICATION_PREFS_KEY = 'nabd:notification-prefs'
export const NOTIFICATION_PREFS_EVENT = 'nabd:notification-prefs'
export const NOTIFICATION_FIRED_PREFIX = 'nabd:notification-fired'

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: false,
  beforeAdhan: true,
  atAdhan: true,
  atIqamah: true,
  morningAdhkar: true,
  eveningAdhkar: true,
}

const PREF_KEYS = Object.keys(DEFAULT_NOTIFICATION_PREFS) as (keyof NotificationPrefs)[]

// Merged per key rather than accepted or rejected whole. A stored object missing one key is the
// shape we will have ourselves the first time a preference is added, and resetting the user's other
// choices because of it would be a worse answer than defaulting the one key we cannot read.
export function parseNotificationPrefs(value: unknown): NotificationPrefs {
  if (typeof value !== 'object' || value === null) return DEFAULT_NOTIFICATION_PREFS
  const record = value as Record<string, unknown>
  return Object.fromEntries(
    PREF_KEYS.map((key) => [
      key,
      typeof record[key] === 'boolean' ? record[key] : DEFAULT_NOTIFICATION_PREFS[key],
    ]),
  ) as NotificationPrefs
}

export function notificationMomentMarker(moment: NotificationMoment): string {
  return `${NOTIFICATION_FIRED_PREFIX}:${toDayId(new Date(moment.at))}:${moment.kind}:${moment.prayerId}`
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
