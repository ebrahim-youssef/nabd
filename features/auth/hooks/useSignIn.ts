'use client'

import { useCallback, useRef, useState } from 'react'

import { signInWithOAuth } from '../db'

// Triggers OAuth sign-in. On success the browser navigates away to the provider, so the
// loading state only ever resets when the flow fails to start. The `inFlight` ref guards
// against a double-tap firing two redirects.
export function useSignIn() {
  const [isLoading, setIsLoading] = useState(false)
  const inFlight = useRef(false)

  const signIn = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setIsLoading(true)
    try {
      await signInWithOAuth(window.location.origin)
    } finally {
      inFlight.current = false
      setIsLoading(false)
    }
  }, [])

  return { signIn, isLoading }
}
