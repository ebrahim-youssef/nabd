import * as Sentry from '@sentry/nextjs'

// Next server instrumentation hook: picks the Sentry init matching the runtime, and routes
// server request errors (Server Components, Route Handlers, Server Actions) to Sentry.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
