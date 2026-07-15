'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'

// Deliberate PWA update prompt (NBD-15). The service worker installs a new version but waits
// (see app/sw.ts); this banner appears when an update is ready and only activates it when the
// user taps — never a silent auto-update mid-session. On activation the app reloads once the new
// worker takes control.
export function UpdateNotifier() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return
      if (registration.waiting) setWaiting(registration.waiting)
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing
        installing?.addEventListener('statechange', () => {
          // A new worker finished installing while one is already controlling the page.
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            setWaiting(registration.waiting ?? installing)
          }
        })
      })
    })

    // Reload once the freshly-activated worker takes control.
    let refreshing = false
    const onControllerChange = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
  }, [])

  if (!waiting) return null

  return (
    <div
      role="alert"
      data-testid="update-notifier"
      className="bg-surface-2 fixed inset-x-0 bottom-4 mx-auto flex w-fit items-center gap-3 rounded-card px-4 py-3 shadow-card-sm"
    >
      <span className="text-body text-foreground">يتوفّر تحديث جديد</span>
      <Button size="sm" onClick={() => waiting.postMessage({ type: 'SKIP_WAITING' })}>
        تحديث
      </Button>
    </div>
  )
}
