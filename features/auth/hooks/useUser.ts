'use client'

import { useEffect, useState } from 'react'

import { getCurrentUser, onUserChange } from '../db'
import type { AuthUser } from '../types'

// `undefined` while the initial lookup is in flight, then `AuthUser | null` (null = signed
// out). Callers render a skeleton for `undefined` rather than coercing it to signed-out.
export type UserState = AuthUser | null | undefined

// Live current-user state: seeds from the session cookie, then tracks sign in / sign out /
// token refresh via Supabase's auth state subscription.
export function useUser(): UserState {
  const [user, setUser] = useState<UserState>(undefined)

  useEffect(() => {
    let active = true

    getCurrentUser().then((current) => {
      if (active) setUser(current)
    })

    const unsubscribe = onUserChange((next) => {
      if (active) setUser(next)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return user
}
