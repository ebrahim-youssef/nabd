'use client'

import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import type { PluginListenerHandle } from '@capacitor/core'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { isNativePlatform } from '@/lib/impure/native'
import { logger } from '@/lib/logger'

import { AUTH_ERROR_PATH } from '../constants'
import { exchangeCodeForSession } from '../db'

// Completes native OAuth (NBD-57, ADR-0013). Sign-in opens the system browser; Supabase
// redirects to nabd://auth/callback, which Android routes back via the manifest
// intent-filter. The exchange must go through the same singleton client that stored the PKCE
// verifier at sign-in (lib/db/supabase/client.ts). No-op on the web.
export function useNativeAuthListener() {
  const router = useRouter()

  useEffect(() => {
    if (!isNativePlatform()) return

    const listener = App.addListener('appUrlOpen', ({ url }) => {
      let code: string | null = null
      try {
        code = new URL(url).searchParams.get('code')
      } catch {
        logger.warn('auth.native callback url unparseable')
      }
      if (!code) return

      void exchangeCodeForSession(code).then((result) => {
        // Close the Custom Tab left behind by the sign-in redirect. Android may have closed
        // it already (or not support closing) — nothing to clean up then.
        void Browser.close().catch(() => undefined)
        if (!result.ok) router.replace(AUTH_ERROR_PATH)
      })
    })

    return () => {
      void listener.then((handle: PluginListenerHandle) => handle.remove())
    }
  }, [router])
}
