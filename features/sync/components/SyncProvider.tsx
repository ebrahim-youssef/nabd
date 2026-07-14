'use client'

import type { ReactNode } from 'react'

import { useSync } from '../hooks/useSync'

// Mounts the background sync loop once for the whole app. Renders its children unchanged; it
// exists only to run `useSync` at the root. No-ops while signed out.
export function SyncProvider({ children }: { children: ReactNode }) {
  useSync()
  return children
}
