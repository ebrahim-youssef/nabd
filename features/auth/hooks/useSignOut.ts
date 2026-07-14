'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'

import { signOut } from '../db'

// Signs the user out, then refreshes the route so any server-rendered, user-dependent content
// re-renders in the signed-out state. The `inFlight` ref guards against a double-tap.
export function useSignOut() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const inFlight = useRef(false)

  const runSignOut = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setIsLoading(true)
    try {
      const result = await signOut()
      if (result.ok) router.refresh()
    } finally {
      inFlight.current = false
      setIsLoading(false)
    }
  }, [router])

  return { signOut: runSignOut, isLoading }
}
