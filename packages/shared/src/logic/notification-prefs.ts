export type NotificationPrefs = {
  enabled: boolean
  beforeAdhan: boolean
  atAdhan: boolean
  atIqamah: boolean
  morningAdhkar: boolean
  eveningAdhkar: boolean
}

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
