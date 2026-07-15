import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { supabaseAnonKey, supabaseUrl } from './env'

// Server-side Supabase client for Server Components, Route Handlers, and Server Actions. Bound
// to the request's cookie store so it reads the current session and (where allowed) writes
// refreshed tokens back. Always create a new client per request — never cache one.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // `setAll` was called from a Server Component, where the cookie store is read-only.
          // This is safe to ignore: the middleware refreshes the session on every request.
        }
      },
    },
  })
}
