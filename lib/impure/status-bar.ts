import { StatusBar, Style } from '@capacitor/status-bar'

import type { Theme } from './appearance'
import { isNativePlatform } from './native'

// Native status-bar chrome for the Android shell (NBD-74). The app draws edge-to-edge (the
// WebView extends behind the status bar); NBD-72's `body { padding-top: env(safe-area-inset-top) }`
// keeps content clear of it, and the strip itself shows the page background (--bg) so the bar
// blends into the app instead of sitting as an opaque system band. All calls are guarded and
// fire-and-forget — on web this module is inert, and a missing plugin never breaks a render.

// Capacitor's Style is named by the *background* it sits on:
//   Style.Light → light background → dark icons  (our light theme)
//   Style.Dark  → dark background  → light icons (our dark theme)
function styleForTheme(theme: Theme): Style {
  return theme === 'dark' ? Style.Dark : Style.Light
}

/** Sets overlay + the icon style once, at app start. */
export async function initStatusBar(theme: Theme): Promise<void> {
  if (!isNativePlatform()) return
  try {
    await StatusBar.setOverlaysWebView({ overlay: true })
    await StatusBar.setStyle({ style: styleForTheme(theme) })
  } catch {
    // No status-bar control just means the default system bar — never block startup.
  }
}

/** Re-applies the icon style after a theme toggle so contrast stays correct. */
export function syncStatusBarStyle(theme: Theme): void {
  if (!isNativePlatform()) return
  void StatusBar.setStyle({ style: styleForTheme(theme) }).catch(() => {})
}
