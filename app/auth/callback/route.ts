import { NextResponse } from 'next/server'

import { createClient } from '@/lib/db/supabase/server'
import { logger } from '@/lib/logger'

import { AUTH_ERROR_PATH } from '@/features/auth/constants'

// OAuth callback. The provider redirects here with a `code`; we exchange it for a session
// (which sets the auth cookies) and then send the user on to their intended destination.
//
// This route legitimately uses the Supabase server client directly: it is server auth
// infrastructure with no React and no hook to route through. The `next` param is validated to
// be a local path so it can't be turned into an open redirect.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const nextParam = searchParams.get('next')
  const next = nextParam && nextParam.startsWith('/') ? nextParam : '/'

  if (!code) {
    logger.warn('auth.callback missing code', { origin })
    return NextResponse.redirect(`${origin}${AUTH_ERROR_PATH}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    logger.error('auth.callback exchange failed', error, { origin })
    return NextResponse.redirect(`${origin}${AUTH_ERROR_PATH}`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
