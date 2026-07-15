import { withSentryConfig } from '@sentry/nextjs'
import withSerwistInit from '@serwist/next'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {/* config options here */}

// Serwist wires the service worker in `app/sw.ts` into the build. Disabled in development so the
// SW's caching never interferes with dev/HMR; it is active in production builds.
const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
})

// Sentry wraps the whole config to inject source-map upload at build time. Upload only
// happens when SENTRY_AUTH_TOKEN is set (Vercel/CI); local builds skip it silently.
export default withSentryConfig(withSerwist(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  disableLogger: true,
})
