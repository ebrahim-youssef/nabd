import { createBrowserClient } from '@supabase/ssr'
import { createClient as createNativeClient, type SupabaseClient } from '@supabase/supabase-js'

import { isNativePlatform } from '@/lib/impure/native'

import { supabaseAnonKey, supabaseUrl } from './env'

let nativeClient: SupabaseClient | null = null

// Browser-side Supabase client. On the web it reads and writes the auth session from cookies
// so it stays in sync with the proxy's session refresh; create a fresh client per call — never
// share one module-level instance across React trees. In the native APK (ADR-0013) there is no
// server and no cookie jar: a plain supabase-js singleton keeps the session in localStorage.
// It must be a singleton — the PKCE verifier written at sign-in has to be readable by the same
// client that exchanges the code when the deep link returns (NBD-57).
export function createClient() {
  if (isNativePlatform()) {
    nativeClient ??= createNativeClient(supabaseUrl, supabaseAnonKey, {
      auth: { flowType: 'pkce', detectSessionInUrl: false },
    })
    return nativeClient
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
