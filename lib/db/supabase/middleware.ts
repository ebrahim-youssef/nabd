import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { supabaseAnonKey, supabaseUrl } from './env'

// Refreshes the Supabase auth session on every matched request and writes the rotated tokens
// back onto the response cookies. Without this, server-rendered views would drift out of sync
// with the browser client and users would get random logouts. Called from the root
// `middleware.ts`.
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        supabaseResponse = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options)
        }
      },
    },
  })

  // IMPORTANT (Supabase SSR): do not run any logic between creating the client and calling
  // getUser(). getUser() revalidates the token with Supabase and triggers the cookie refresh.
  await supabase.auth.getUser()

  return supabaseResponse
}
