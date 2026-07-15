import { createBrowserClient } from '@supabase/ssr'

import { supabaseAnonKey, supabaseUrl } from './env'

// Browser-side Supabase client. Reads and writes the auth session from cookies so it stays in
// sync with the server client and the middleware. Create a fresh client per call — never share
// one module-level instance across React trees.
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
