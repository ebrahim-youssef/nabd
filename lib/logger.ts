// The single place `console.*` is allowed (enforced by the no-console lint override in
// eslint.config.mjs). Everything else logs through this Logger. Logs carry full detail here;
// user-facing surfaces show a friendly message instead. Sentry wiring lands in NBD-11.

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
  },
}
