// Repository and use-case functions return a typed result instead of throwing: they catch
// their own errors, log the full cause via the Logger, and hand the UI a short `error` code
// it can map to a friendly message. See CONVENTIONS.md "Logging & errors".
export type Result<T> = { ok: true; value: T } | { ok: false; error: string }
