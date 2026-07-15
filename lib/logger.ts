import * as Sentry from '@sentry/nextjs'

// The single place `console.*` is allowed (enforced by the no-console lint override in
// eslint.config.mjs). Everything else logs through this Logger. Logs carry full detail here;
// user-facing surfaces show a friendly message instead. `error` also reports to Sentry
// (NBD-11) — repositories catch their own errors, so without this handled failures would
// never reach observability. A no-op when the DSN is unset (dev, CI, tests).

type LogContext = Record<string, unknown>

export const logger = {
  debug(message: string, context?: LogContext): void {
    console.debug(message, context ?? {})
  },
  info(message: string, context?: LogContext): void {
    console.info(message, context ?? {})
  },
  warn(message: string, context?: LogContext): void {
    console.warn(message, context ?? {})
  },
  error(message: string, error?: unknown, context?: LogContext): void {
    console.error(message, error, context ?? {})
    Sentry.captureException(error ?? new Error(message), {
      extra: { message, ...context },
    })
  },
}
