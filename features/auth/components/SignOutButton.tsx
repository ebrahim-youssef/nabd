'use client'

import { Button } from '@/components/ui/button'

import { useSignOut } from '../hooks/useSignOut'

export function SignOutButton() {
  const { signOut, isLoading } = useSignOut()

  return (
    <Button variant="outline" onClick={signOut} disabled={isLoading} aria-busy={isLoading}>
      {isLoading ? 'جارٍ الخروج…' : 'تسجيل الخروج'}
    </Button>
  )
}
