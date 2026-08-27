import { SETTINGS_COPY } from '@nabd/shared'
import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'

import { COORDS_EVENT, readCachedCoords } from '../prayer-times/location'
import {
  browserNotificationPermission,
  requestBrowserNotificationPermission,
} from '../notifications/browser'
import { NOTIFICATION_PREFS_EVENT } from '../notifications/logic'
import { readNotificationPrefs, writeNotificationPrefs } from '../notifications/preferences'
import type { BrowserNotificationPermission } from '../notifications/browser'
import type { NotificationPrefs } from '../notifications/logic'

const MOMENT_TOGGLES: { key: Exclude<keyof NotificationPrefs, 'enabled'>; label: string }[] = [
  { key: 'beforeAdhan', label: SETTINGS_COPY.notifications.beforeAdhan },
  { key: 'atAdhan', label: SETTINGS_COPY.notifications.atAdhan },
  { key: 'atIqamah', label: SETTINGS_COPY.notifications.atIqamah },
  { key: 'morningAdhkar', label: SETTINGS_COPY.notifications.morningAdhkar },
  { key: 'eveningAdhkar', label: SETTINGS_COPY.notifications.eveningAdhkar },
]

// Browser notifications are deliberately foreground-only in the SPA. The native target owns
// background delivery, sounds and device settings under ADR-0014.
export function NotificationSettings() {
  const [prefs, setPrefs] = useState(readNotificationPrefs)
  const [permission, setPermission] = useState<BrowserNotificationPermission>(
    browserNotificationPermission,
  )
  const [hasLocation, setHasLocation] = useState(() => readCachedCoords() !== null)

  useEffect(() => {
    const syncPrefs = () => setPrefs(readNotificationPrefs())
    const syncLocation = () => setHasLocation(readCachedCoords() !== null)
    window.addEventListener(NOTIFICATION_PREFS_EVENT, syncPrefs)
    window.addEventListener(COORDS_EVENT, syncLocation)
    return () => {
      window.removeEventListener(NOTIFICATION_PREFS_EVENT, syncPrefs)
      window.removeEventListener(COORDS_EVENT, syncLocation)
    }
  }, [])

  function save(next: NotificationPrefs) {
    setPrefs(next)
    writeNotificationPrefs(next)
  }

  async function toggleMaster(nextEnabled: boolean) {
    if (!nextEnabled) {
      save({ ...prefs, enabled: false })
      return
    }
    const nextPermission = await requestBrowserNotificationPermission()
    setPermission(nextPermission)
    save({ ...prefs, enabled: nextPermission === 'granted' })
  }

  if (permission === 'unsupported') {
    return (
      <section className="flex flex-col gap-3" data-testid="notification-settings">
        <h2 className="font-display text-title text-primary">
          {SETTINGS_COPY.notifications.heading}
        </h2>
        <p className="rounded-card border border-border bg-surface p-4 text-small text-muted-foreground shadow-card-small">
          {SETTINGS_COPY.notifications.unsupported}
        </p>
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-3" data-testid="notification-settings">
      <h2 className="font-display text-title text-primary">
        {SETTINGS_COPY.notifications.heading}
      </h2>
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card-small">
        <label className="flex items-center justify-between gap-3 text-body font-medium text-foreground">
          <span className="flex items-center gap-2">
            <Bell className="size-5 text-primary" aria-hidden />
            {SETTINGS_COPY.notifications.enable}
          </span>
          <input
            type="checkbox"
            checked={prefs.enabled && permission === 'granted'}
            onChange={(event) => void toggleMaster(event.target.checked)}
            className="accent-primary size-5"
            data-testid="notification-enabled"
          />
        </label>
        <p className="text-small text-muted-foreground">
          {SETTINGS_COPY.notifications.foregroundOnly}
        </p>
        {permission === 'denied' && (
          <p className="text-small text-gold">{SETTINGS_COPY.notifications.blocked}</p>
        )}
        {prefs.enabled && !hasLocation && (
          <p className="text-small text-gold">{SETTINGS_COPY.notifications.locationRequired}</p>
        )}
        {prefs.enabled && (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            {MOMENT_TOGGLES.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 text-small text-foreground"
              >
                {label}
                <input
                  type="checkbox"
                  checked={prefs[key]}
                  onChange={(event) => save({ ...prefs, [key]: event.target.checked })}
                  className="accent-primary size-4"
                  data-testid={`notification-moment-${key}`}
                />
              </label>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
