'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { logger } from '@/lib/logger'

import { AUTH_ERROR_PATH } from '../constants'
import { exchangeCodeForSession } from '../db'
import { safeInternalPath } from '../logic'

// Drives the OAuth callback page: reads `code` and `next` from the query string, exchanges
// the code for a session, then sends the user on. `next` is passed through `safeInternalPath`
// so it can only ever be a same-origin path — never an open redirect.
export function useAuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // React Strict Mode runs effects twice in development; the code is single-use, so the
  // second invocation would always fail the exchange and bounce to the error page.
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const code = searchParams.get('code')
    // Constrain the redirect to a same-origin path so the callback can't be turned into an
    // open redirect (audit F2).
    const next = safeInternalPath(searchParams.get('next'))

    if (!code) {
      logger.warn('auth.callback missing code')
      router.replace(AUTH_ERROR_PATH)
      return
    }

    void exchangeCodeForSession(code).then((result) => {
      router.replace(result.ok ? next : AUTH_ERROR_PATH)
    })
  }, [router, searchParams])
}
