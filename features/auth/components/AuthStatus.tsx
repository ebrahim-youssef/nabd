'use client'

import { useUser } from '../hooks/useUser'
import { SignInButton } from './SignInButton'
import { SignOutButton } from './SignOutButton'

// Renders the current auth state: a loading placeholder while the session is resolving, the
// sign-in button when signed out, or the user's email plus a sign-out button when signed in.
// This is the visible surface that proves NBD-4 — a session that survives a reload.
export function AuthStatus() {
  const user = useUser()

  if (user === undefined) {
    return (
      <div
        className="bg-surface-2 h-8 w-40 animate-pulse rounded-lg"
        aria-hidden
        data-testid="auth-loading"
      />
    )
  }

  if (user === null) {
    return <SignInButton />
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground text-small">{user.email ?? 'مستخدم'}</span>
      <SignOutButton />
    </div>
  )
}
