'use client'

import { Button } from '@/components/ui/button'

import { useSignIn } from '../hooks/useSignIn'

export function SignInButton() {
  const { signIn, isLoading } = useSignIn()

  return (
    <Button onClick={signIn} disabled={isLoading} aria-busy={isLoading}>
      {isLoading ? 'جارٍ الدخول…' : 'تسجيل الدخول'}
    </Button>
  )
}
