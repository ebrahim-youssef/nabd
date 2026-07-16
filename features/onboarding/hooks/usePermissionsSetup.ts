'use client'

import { useCallback, useState } from 'react'

import { requestCoords } from '@/lib/impure/location'
import {
  DEFAULT_PREFS,
  notificationPermission,
  requestNotificationPermission,
  writeNotificationPrefs,
  type NotificationPrefs,
} from '@/lib/impure/notifications'

type PermissionsSetup = {
  locationGranted: boolean
  // null until the user touches the notifications toggle; 'denied' disables the toggles.
  notificationPermission: NotificationPermission | null
  prefs: NotificationPrefs
  requestLocation: () => Promise<void>
  toggleNotifications: () => Promise<void>
  setMoment: (key: 'beforeAdhan' | 'atAdhan' | 'atIqamah', value: boolean) => void
  // Persists the chosen prefs; called once when onboarding finishes.
  persist: () => void
}

// The onboarding permissions step (ADR-0009): both permissions are asked here, from explicit
// user gestures, never unprompted. Location is the stronger recommendation (prayer times);
// notifications are opt-in with per-moment toggles.
export function usePermissionsSetup(): PermissionsSetup {
  const [locationGranted, setLocationGranted] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission | null>(null)
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)

  const requestLocation = useCallback(async () => {
    const coords = await requestCoords()
    setLocationGranted(coords !== null)
  }, [])

  const toggleNotifications = useCallback(async () => {
    if (prefs.enabled) {
      setPrefs((prev) => ({ ...prev, enabled: false }))
      return
    }
    // Already-granted permission flips the toggle synchronously (no await), so the checkbox
    // responds in the same tick; only a first-time grant goes through the async prompt.
    if (notificationPermission() === 'granted') {
      setPermission('granted')
      setPrefs((prev) => ({ ...prev, enabled: true }))
      return
    }
    const result = await requestNotificationPermission()
    setPermission(result)
    if (result === 'granted') setPrefs((prev) => ({ ...prev, enabled: true }))
  }, [prefs.enabled])

  const setMoment = useCallback((key: 'beforeAdhan' | 'atAdhan' | 'atIqamah', value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }))
  }, [])

  const persist = useCallback(() => {
    writeNotificationPrefs(prefs)
  }, [prefs])

  return {
    locationGranted,
    notificationPermission: permission,
    prefs,
    requestLocation,
    toggleNotifications,
    setMoment,
    persist,
  }
}
