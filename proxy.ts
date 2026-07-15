import type { NextRequest } from 'next/server'

import { updateSession } from '@/lib/db/supabase/middleware'

// Next.js "proxy" (formerly "middleware") entry point. Runs before rendering on every matched
// request to refresh the Supabase auth session so server-rendered views stay in sync with the
// browser client. See `updateSession` for the cookie-refresh details.
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  // Run on every route except Next internals and static asset files. Keeping the auth-cookie
  // refresh off static requests avoids needless work while still covering every page and
  // route handler that renders user-dependent content.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
