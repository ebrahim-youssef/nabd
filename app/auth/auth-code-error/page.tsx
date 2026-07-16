import { TriangleAlert } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'تعذّر تسجيل الدخول · نبض',
}

// Shown when the OAuth callback can't complete the sign-in (missing or invalid code). Gives
// the user a clear message and a way back to try again.
export default function AuthCodeErrorPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 pt-10 pb-16 text-center md:pt-16">
      <span
        aria-hidden
        className="bg-gold-soft text-gold flex size-16 items-center justify-center rounded-icon"
      >
        <TriangleAlert className="size-8" />
      </span>
      <h1 className="font-display text-title text-primary">تعذّر تسجيل الدخول</h1>
      <p className="text-muted-foreground text-body">
        حدث خطأ أثناء إكمال تسجيل الدخول. يُرجى المحاولة مرّة أخرى.
      </p>
      <Button asChild>
        <Link href="/">العودة إلى الرئيسية</Link>
      </Button>
    </main>
  )
}
