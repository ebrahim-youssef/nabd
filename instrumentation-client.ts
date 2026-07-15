import * as Sentry from '@sentry/nextjs'

import { SENTRY_DSN, SENTRY_ENABLED, SENTRY_TRACES_SAMPLE_RATE } from '@/lib/observability'

// Browser-side Sentry init. Next loads this file once in the client bundle before the app
// boots (Next instrumentation convention).
Sentry.init({
  dsn: SENTRY_DSN,
  enabled: SENTRY_ENABLED,
  tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
})

// Lets Sentry tie client-side navigations into traces.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
