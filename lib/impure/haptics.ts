import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

import { isNativePlatform } from './native'

// Tactile feedback for the Android shell (NBD-73). Guarded by isNativePlatform() so the web
// build never touches the bridge — on plain web every call is a no-op, not a Vibration-API
// buzz (that would feel wrong in a browser tab). Every call is fire-and-forget and swallows
// its own errors: a missing plugin (stale APK) or a device without a vibrator must never
// break the tap it was decorating.

/** Light tap — the default for any discrete press: buttons, nav, accordion headers. */
export function hapticTap(): void {
  if (!isNativePlatform()) return
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
}

/** Firmer tap — a state change worth feeling: marking a wird item done, toggling a switch. */
export function hapticToggle(): void {
  if (!isNativePlatform()) return
  void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {})
}

/** Success pattern — a milestone: completing an area or the whole day (celebration). */
export function hapticSuccess(): void {
  if (!isNativePlatform()) return
  void Haptics.notification({ type: NotificationType.Success }).catch(() => {})
}
