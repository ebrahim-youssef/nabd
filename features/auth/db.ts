import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/db/supabase/client'
import { logger } from '@/lib/logger'
import type { Result } from '@/types/result'

import { AUTH_CALLBACK_PATH, AUTH_ERROR, OAUTH_PROVIDER } from './constants'
import type { AuthUser } from './types'

// All Supabase auth access for the browser lives here (the repository seam). Server-side code
// paths — the callback route's code exchange, session reads in Server Components — use the
// server client directly from `@/lib/db/supabase/server`, since a repository imported by
// client hooks must not pull in `next/headers`.

function toAuthUser(user: User): AuthUser {
  return { id: user.id, email: user.email ?? null }
}

// Starts the OAuth round-trip. On success the browser is redirected to the provider, so a
// resolved `ok` result here only means the redirect was initiated; a real error is one that
// stopped the flow before it left the page.
export async function signInWithOAuth(origin: string): Promise<Result<void>> {
  try {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: OAUTH_PROVIDER,
      options: { redirectTo: `${origin}${AUTH_CALLBACK_PATH}` },
    })
    if (error) {
      logger.error('auth.signInWithOAuth failed', error, { provider: OAUTH_PROVIDER })
      return { ok: false, error: AUTH_ERROR.signIn }
    }
    return { ok: true, value: undefined }
  } catch (cause) {
    logger.error('auth.signInWithOAuth threw', cause, { provider: OAUTH_PROVIDER })
    return { ok: false, error: AUTH_ERROR.signIn }
  }
}

export async function signOut(): Promise<Result<void>> {
  try {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      logger.error('auth.signOut failed', error)
      return { ok: false, error: AUTH_ERROR.signOut }
    }
    return { ok: true, value: undefined }
  } catch (cause) {
    logger.error('auth.signOut threw', cause)
    return { ok: false, error: AUTH_ERROR.signOut }
  }
}

// Reads the current user from the session cookie. Returns null when signed out. Errors are
// logged and collapsed to null — a missing user and a failed lookup look the same to the UI
// (signed out), which is the safe default.
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error || !user) return null
    return toAuthUser(user)
  } catch (cause) {
    logger.error('auth.getCurrentUser threw', cause)
    return null
  }
}

// Subscribes to auth state changes (sign in, sign out, token refresh) and calls back with the
// current user or null. Returns an unsubscribe function for effect cleanup.
export function onUserChange(callback: (user: AuthUser | null) => void): () => void {
  const supabase = createClient()
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ? toAuthUser(session.user) : null)
  })
  return () => subscription.unsubscribe()
}
