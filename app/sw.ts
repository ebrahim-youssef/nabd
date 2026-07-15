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

serwist.addEventListeners()
