import * as Sentry from '@sentry/react'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN?.trim()
let sentryInitialized = false

export function initializeSentry(): void {
  if (!sentryDsn || sentryInitialized) return
  Sentry.init({ dsn: sentryDsn, enabled: true })
  sentryInitialized = true
}

export function captureException(cause: unknown): void {
  if (!sentryInitialized) return
  Sentry.captureException(cause)
}

export { Sentry }
