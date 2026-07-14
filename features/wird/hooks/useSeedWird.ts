'use client'

import { useEffect } from 'react'

import { DEFAULT_WIRD } from '@/content/default_wird'
import { now, today } from '@/lib/impure/clock'

import { listVersions, seedVersionIfEmpty } from '../db'

// Guards against seeding more than once per app load, even if the hook is mounted by more than
// one component. `seedVersionIfEmpty` also re-checks the store, so this is belt-and-braces
// against a double-seed race between concurrent readers.
let seedAttempted = false

// Seeds a starter wird version the first time the store is empty. Mounted once (by the
// checklist). Read hooks stay pure reads so multiple readers never race to seed.
export function useSeedWird() {
  useEffect(() => {
    if (seedAttempted) return
    seedAttempted = true
    void (async () => {
      const versions = await listVersions()
      if (versions.length === 0) {
        await seedVersionIfEmpty(today(), DEFAULT_WIRD, now())
      }
    })()
  }, [])
}
