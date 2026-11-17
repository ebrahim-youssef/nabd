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
