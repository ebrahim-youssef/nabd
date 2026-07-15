import * as Sentry from '@sentry/nextjs'

import { SENTRY_DSN, SENTRY_ENABLED, SENTRY_TRACES_SAMPLE_RATE } from '@/lib/observability'

// Node runtime Sentry init — loaded from instrumentation.ts register().
Sentry.init({
  dsn: SENTRY_DSN,
  enabled: SENTRY_ENABLED,
  tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
})
