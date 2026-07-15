'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

import './globals.css'

// Last-resort error boundary: replaces the root layout when it (or anything above a nested
// boundary) throws, so it must render its own <html>/<body>. Reports the error to Sentry
// with full detail; the user sees a friendly Arabic message (CONVENTIONS.md "Logging &
// errors").
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="ar" dir="rtl" data-mode="classic" data-theme="light">
      <body className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-title text-primary font-bold">حدث خطأ غير متوقّع</h1>
        <p className="text-muted-foreground text-body">
          نعتذر عن هذا الخلل. تم تسجيل المشكلة وسنعمل على إصلاحها.
        </p>
        <button
          type="button"
          onClick={reset}
          className="bg-primary text-primary-foreground rounded-md px-6 py-2"
        >
          إعادة المحاولة
        </button>
      </body>
    </html>
  )
}
