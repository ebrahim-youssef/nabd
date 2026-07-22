import { App } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'

import { isNativePlatform } from './native'

// Android hardware back button (NBD-75). @capacitor/app is already a dependency (it carries the
// OAuth deep link). With no listener, Capacitor's default back walks the WebView history and
// then abruptly kills the app — which feels nothing like a native app. Registering a listener
// takes over that decision entirely. Inert on web.

/**
 * Registers a hardware-back handler. Returns an async unsubscribe. On web it's a no-op and the
 * unsubscribe resolves immediately.
 */
export function onHardwareBack(handler: () => void): () => void {
  if (!isNativePlatform()) return () => {}
  let handle: PluginListenerHandle | undefined
  void App.addListener('backButton', handler)
    .then((h) => {
      handle = h
    })
    .catch(() => {})
  return () => {
    void handle?.remove().catch(() => {})
  }
}

/** Closes the app (the deliberate exit at a root tab). No-op on web. */
export function exitApp(): void {
  if (!isNativePlatform()) return
  void App.exitApp().catch(() => {})
}
