import { isNativePlatform } from './native'

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

// Must be called from a user gesture. Resolves the resulting permission state. Inside the
// Android shell (NBD-46) the webview has no Notification API — the Capacitor plugin carries
// the runtime POST_NOTIFICATIONS prompt instead.
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const result = await LocalNotifications.requestPermissions()
      return result.display === 'granted' ? 'granted' : 'denied'
    } catch {
      return 'denied'
    }
  }
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

// Real per-moment sounds (NBD-42, r4 §5): a soft chime before, the adhan itself at adhan
// time — الفجر gets its own recording («الصلاة خير من النوم») — and the iqama at iqama time.
// Foreground-only: the Web Notification API has no cross-platform custom sound (ADR-0009);
// with the app closed the OS default plays until the push backend (ADR-0011) exists.
const SOUND_FILES: Record<NotificationMomentKind, string> = {
  before: '/sounds/before.mp3',
  adhan: '/sounds/adhan.mp3',
  iqamah: '/sounds/iqama.mp3',
}

const FAJR_ADHAN_FILE = '/sounds/adhan-fajr.mp3'
const FAJR_PRAYER_ID = 'fajr'

export function soundFileFor(kind: NotificationMomentKind, prayerId?: string): string {
  if (kind === 'adhan' && prayerId === FAJR_PRAYER_ID) return FAJR_ADHAN_FILE
  return SOUND_FILES[kind]
}

// One shared element so a new moment (or a settings preview) replaces the playing sound
// instead of overlapping it.
let activeAudio: HTMLAudioElement | null = null

export function playMomentSound(kind: NotificationMomentKind, prayerId?: string): void {
  if (document.visibilityState !== 'visible') return
  try {
    activeAudio?.pause()
    activeAudio = new Audio(soundFileFor(kind, prayerId))
    void activeAudio.play().catch(() => {
      // Autoplay may be blocked before any user gesture — silent degradation.
    })
  } catch {
    // No audio is a silent degradation, literally.
  }
}

export function stopMomentSound(): void {
  activeAudio?.pause()
  activeAudio = null
}
