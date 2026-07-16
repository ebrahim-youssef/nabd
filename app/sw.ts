// This file is compiled by Serwist (not the app's `tsc`), so it is excluded from tsconfig and
// runs in a service-worker context where ServiceWorkerGlobalScope is ambient.
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

// Service worker (NBD-15). Deliberate update strategy: a new worker installs and then WAITS
// (skipWaiting: false) — it never takes over mid-session. The UpdateNotifier shows an "update
// available" prompt; only when the user opts in does the app post SKIP_WAITING (below) to
// activate the new worker and reload.

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

// User opted in to the update: activate the waiting worker now.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})

// Push groundwork (NBD-42, ADR-0011 proposed): shows a pushed prayer notification even with
// every tab closed. Inert until the backend that sends pushes exists.
self.addEventListener('push', (event) => {
  if (!event.data) return
  let payload: { title?: string; body?: string } = {}
  try {
    payload = event.data.json() as { title?: string; body?: string }
  } catch {
    payload = { body: event.data.text() }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'نبض', {
      body: payload.body ?? '',
      dir: 'rtl',
      lang: 'ar',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    }),
  )
})

// Tapping the notification focuses the app (or opens it fresh).
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients[0]
      if (existing) return existing.focus()
      return self.clients.openWindow('/')
    }),
  )
})

serwist.addEventListeners()
