'use client'

import { useNativeAuthListener } from '../hooks/useNativeAuthListener'

// Mount point for the native deep-link OAuth listener (NBD-57) — layout needs a component,
// the behavior lives in the hook. Renders nothing on every platform.
export function NativeAuthListener() {
  useNativeAuthListener()
  return null
}
