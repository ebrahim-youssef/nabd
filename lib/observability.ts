// Shared Sentry configuration. Imported by all three runtime init files
// (instrumentation-client.ts, sentry.server.config.ts, sentry.edge.config.ts) so the
// numbers live in exactly one place.
//
// NEXT_PUBLIC_SENTRY_DSN is inlined at build time — must be referenced literally (same
// rule as lib/db/supabase/env.ts). Unset DSN (local dev, CI) disables Sentry entirely.
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

export const SENTRY_ENABLED = Boolean(SENTRY_DSN)

// Fraction of transactions sampled for performance tracing. Kept low — errors are the
// point of NBD-11; tracing is a bonus signal.
export const SENTRY_TRACES_SAMPLE_RATE = 0.1
