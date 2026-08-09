import { SplashScreen } from '@capacitor/splash-screen'

import { isNativePlatform } from './native'

// Cold-start splash (NBD-76). The native Android-12 splash hands off to the WebView, which was
// flashing white while the bundle booted. The Capacitor splash (configured launchAutoHide:false
// in capacitor.config.ts) holds a branded teal screen over that gap; we hide it — with a short
// fade — only once the app has actually mounted, so the user never sees the white flash.
// Guarded + fire-and-forget: inert on web, and a failure here must never leave the splash stuck
// (the config also carries a launchShowDuration backstop).
export function hideSplash(): void {
  if (!isNativePlatform()) return
  void SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {})
}
