'use client'

import { useEffect } from 'react'

import { isNativePlatform } from '@/lib/impure/native'
import { initStatusBar, syncStatusBarStyle } from '@/lib/impure/status-bar'

// Mounts the native-shell chrome that has no web equivalent (NBD-74): the edge-to-edge status
// bar, kept in sync with the app's light/dark theme. Renders nothing and is inert on web.
// Later native-feel items (hardware back button, splash) hook in here too.
function currentTheme(): 'light' | 'dark' {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

export function NativeChrome() {
  useEffect(() => {
    if (!isNativePlatform()) return

    void initStatusBar(currentTheme())

    // The theme can change at runtime (settings toggle) via a data-theme swap on <html>
    // (lib/impure/appearance.ts). Track it so the status-bar icon contrast stays correct.
    const root = document.documentElement
    const observer = new MutationObserver(() => syncStatusBarStyle(currentTheme()))
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return null
}
