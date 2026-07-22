'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { exitApp, onHardwareBack } from '@/lib/impure/back-button'
import { isNativePlatform } from '@/lib/impure/native'
import { hideSplash } from '@/lib/impure/splash'
import { initStatusBar, syncStatusBarStyle } from '@/lib/impure/status-bar'

// Mounts the native-shell chrome that has no web equivalent (NBD-74/75): the edge-to-edge
// status bar kept in sync with the theme, and the Android hardware back button. Renders only a
// transient exit-confirm toast, and is inert on web.

// The five bottom-nav roots (BottomNav). Back on any of these runs the exit-confirm flow;
// anywhere else it walks history back.
const ROOT_ROUTES = new Set(['/', '/libraries', '/prayer-times', '/stats', '/settings'])

const EXIT_CONFIRM_MS = 2000
const EXIT_TOAST = 'اضغط مرة أخرى للخروج'

function currentTheme(): 'light' | 'dark' {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

export function NativeChrome() {
  const router = useRouter()
  const pathname = usePathname()
  const [showExitToast, setShowExitToast] = useState(false)

  // The back handler is registered once; refs keep it reading the latest route/state without
  // re-registering the native listener on every navigation.
  const pathnameRef = useRef(pathname)
  const awaitingExitRef = useRef(false)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  // Status bar: overlay + theme-tracked icon contrast. Also hides the cold-start splash now
  // that the app has mounted and painted, bridging the WebView-boot white flash (NBD-76).
  useEffect(() => {
    if (!isNativePlatform()) return
    hideSplash()
    void initStatusBar(currentTheme())
    const root = document.documentElement
    const observer = new MutationObserver(() => syncStatusBarStyle(currentTheme()))
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  // Hardware back button.
  useEffect(() => {
    if (!isNativePlatform()) return

    const handleBack = () => {
      // 1. An open modal/sheet consumes the press (it cancels the event).
      const consumed = !window.dispatchEvent(new CustomEvent('nabd:back', { cancelable: true }))
      if (consumed) return

      // 2. On a sub-screen, walk history back.
      if (!ROOT_ROUTES.has(pathnameRef.current)) {
        router.back()
        return
      }

      // 3. On a root tab, require a second press within the window to exit.
      if (awaitingExitRef.current) {
        exitApp()
        return
      }
      awaitingExitRef.current = true
      setShowExitToast(true)
      exitTimerRef.current = setTimeout(() => {
        awaitingExitRef.current = false
        setShowExitToast(false)
      }, EXIT_CONFIRM_MS)
    }

    const unsubscribe = onHardwareBack(handleBack)
    return () => {
      unsubscribe()
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    }
  }, [router])

  if (!showExitToast) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-6"
    >
      <span className="bg-foreground/90 text-background rounded-chip px-4 py-2 text-small shadow-card">
        {EXIT_TOAST}
      </span>
    </div>
  )
}
