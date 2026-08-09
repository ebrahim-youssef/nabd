import { Browser } from '@capacitor/browser'
import type { User } from '@supabase/supabase-js'

import { createClient } from '@/lib/db/supabase/client'
import { isNativePlatform } from '@/lib/impure/native'
import { logger } from '@/lib/logger'
import type { Result } from '@/types/result'

import { AUTH_CALLBACK_PATH, AUTH_ERROR, NATIVE_AUTH_CALLBACK, OAUTH_PROVIDER } from './constants'
import type { AuthUser } from './types'

// All Supabase auth access lives here (the repository seam). Everything runs in the browser —
// sign-in redirect, code exchange on the callback page, session reads — via the browser
// client; there is no server-side auth path (the proxy only refreshes the session cookies).

function toAuthUser(user: User): AuthUser {
  return { id: user.id, email: user.email ?? null }
}

// Starts the OAuth round-trip. On the web the browser is redirected to the provider, so a
// resolved `ok` result only means the redirect was initiated. On native (ADR-0013) the flow
// opens the system browser and returns via the nabd:// deep link (NativeAuthListener); a real
// error is one that stopped the flow before it left the app.
export async function signInWithOAuth(origin: string): Promise<Result<void>> {
  try {
    const supabase = createClient()
    const native = isNativePlatform()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: OAUTH_PROVIDER,
      options: native
        ? { redirectTo: NATIVE_AUTH_CALLBACK, skipBrowserRedirect: true }
        : { redirectTo: `${origin}${AUTH_CALLBACK_PATH}` },
    })
    if (error || (native && !data.url)) {
      logger.error('auth.signInWithOAuth failed', error ?? new Error('missing redirect url'), {
        provider: OAUTH_PROVIDER,
      })
      return { ok: false, error: AUTH_ERROR.signIn }
    }
    if (native && data.url) {
      await Browser.open({ url: data.url })
    }
    return { ok: true, value: undefined }
  } catch (cause) {
    logger.error('auth.signInWithOAuth threw', cause, { provider: OAUTH_PROVIDER })
    return { ok: false, error: AUTH_ERROR.signIn }
  }
}

// Completes the OAuth round-trip: exchanges the `code` the provider redirected back with for
// a session. Must run in the same browser context that started the sign-in — the client reads
// the PKCE verifier it stored then and persists the resulting session.
export async function exchangeCodeForSession(code: string): Promise<Result<void>> {
  try {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      logger.error('auth.exchangeCodeForSession failed', error)
      return { ok: false, error: AUTH_ERROR.codeExchange }
    }
    return { ok: true, value: undefined }
  } catch (cause) {
    logger.error('auth.exchangeCodeForSession threw', cause)
    return { ok: false, error: AUTH_ERROR.codeExchange }
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
