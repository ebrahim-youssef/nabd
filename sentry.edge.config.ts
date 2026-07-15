import * as Sentry from '@sentry/nextjs'

import { SENTRY_DSN, SENTRY_ENABLED, SENTRY_TRACES_SAMPLE_RATE } from '@/lib/observability'

// Edge runtime Sentry init (proxy/middleware and any edge routes) — loaded from
// instrumentation.ts register().
Sentry.init({
  dsn: SENTRY_DSN,
  enabled: SENTRY_ENABLED,
  tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
})
