// Notification plumbing (ADR-0009): permission, device-local preferences, delivery, and the
// per-moment foreground tones. Preferences are a device setting (like coordinates) — they
// live in localStorage, never in Dexie, never synced.

export type NotificationPrefs = {
  enabled: boolean
  beforeAdhan: boolean
  atAdhan: boolean
  atIqamah: boolean
}

export type NotificationMomentKind = 'before' | 'adhan' | 'iqamah'

const STORAGE_KEY = 'nabd:notification-prefs'

export const DEFAULT_PREFS: NotificationPrefs = {
  enabled: false,
  beforeAdhan: true,
  atAdhan: true,
  atIqamah: true,
}

export function readNotificationPrefs(): NotificationPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFS
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotificationPrefs>) }
  } catch {
    return DEFAULT_PREFS
  }
}

export function writeNotificationPrefs(prefs: NotificationPrefs): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Losing the cache only costs re-choosing the toggles.
  }
}

// Must be called from a user gesture. Resolves the resulting permission state.
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

export function notificationPermission(): NotificationPermission {
  return 'Notification' in window ? Notification.permission : 'denied'
}

// Delivers a prayer notification. Prefers the service worker registration (survives a hidden
// tab on installed PWAs); falls back to a page-scoped Notification. Sound: the platform
// default — the Web Notification API has no cross-platform custom sound (ADR-0009), so the
// distinct per-moment tone plays only in the foreground via playMomentTone.
export async function showPrayerNotification(title: string, body: string): Promise<void> {
  if (notificationPermission() !== 'granted') return
  const registration = await navigator.serviceWorker?.getRegistration()
  if (registration) {
    await registration.showNotification(title, { body, dir: 'rtl', lang: 'ar' })
    return
  }
  new Notification(title, { body, dir: 'rtl', lang: 'ar' })
}

// Distinct foreground tone per moment (ADR-0009): before = one soft note, adhan = a rising
// triad, iqamah = two quick notes. WebAudio — no bundled assets. Fixed for now; user-custom
// sounds arrive with the push backend.
const TONE_SEQUENCES: Record<NotificationMomentKind, { freq: number; at: number }[]> = {
  before: [{ freq: 660, at: 0 }],
  adhan: [
    { freq: 523, at: 0 },
    { freq: 659, at: 0.25 },
    { freq: 784, at: 0.5 },
  ],
  iqamah: [
    { freq: 784, at: 0 },
    { freq: 784, at: 0.2 },
  ],
}

const TONE_DURATION_S = 0.18
const TONE_GAIN = 0.04

export function playMomentTone(kind: NotificationMomentKind): void {
  if (document.visibilityState !== 'visible') return
  try {
    const context = new AudioContext()
    for (const { freq, at } of TONE_SEQUENCES[kind]) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.frequency.value = freq
      gain.gain.value = TONE_GAIN
      oscillator.connect(gain).connect(context.destination)
      oscillator.start(context.currentTime + at)
      oscillator.stop(context.currentTime + at + TONE_DURATION_S)
    }
  } catch {
    // No audio is a silent degradation, literally.
  }
}
