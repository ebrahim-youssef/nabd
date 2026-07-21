'use client'

import { Loader2 } from 'lucide-react'
import { Suspense } from 'react'

import { useAuthCallback } from '@/features/auth/hooks/useAuthCallback'

// OAuth callback. The provider redirects here with a `code`; the hook exchanges it for a
// session and sends the user on to their intended destination.
//
// This is a client page, not a route handler, so the exact same code path works on the web
// build and on the static-export native build (ADR-0013), and the browser client that stored
// the PKCE verifier at sign-in is the one performing the exchange.
function CallbackHandler() {
  useAuthCallback()
  return <CallbackPending />
}

function CallbackPending() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 pt-10 pb-16 text-center md:pt-16">
      <Loader2 aria-hidden className="text-primary size-8 animate-spin" />
      <p className="text-muted-foreground text-body">جارٍ إكمال تسجيل الدخول…</p>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    // `useSearchParams` requires a Suspense boundary; the fallback matches the pending view so
    // the user sees one steady screen for the whole exchange.
    <Suspense fallback={<CallbackPending />}>
      <CallbackHandler />
    </Suspense>
  )
}
