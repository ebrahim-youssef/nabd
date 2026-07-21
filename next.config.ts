import { withSentryConfig } from '@sentry/nextjs'
import withSerwistInit from '@serwist/next'
import type { NextConfig } from 'next'

// The native (Capacitor) build is a static export bundled into the APK (ADR-0013): the whole
// app must exist as files on disk so the WebView boots with zero network. The web build on
// Vercel stays server-rendered and is unaffected by this flag.
const isNativeBuild = process.env.NEXT_PUBLIC_BUILD_TARGET === 'native'

const nextConfig: NextConfig = isNativeBuild
  ? {
      output: 'export',
      // The export target has no image-optimizer server; this keeps any future next/image
      // usage from breaking the native build.
      images: { unoptimized: true },
    }
  : {}

// Serwist wires the service worker in `app/sw.ts` into the build. Disabled in development so
// the SW's caching never interferes with dev/HMR, and in the native build — the APK already
// ships every asset locally and service workers are unreliable inside the Capacitor WebView
// (ADR-0013). Active in production web builds.
const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development' || isNativeBuild,
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
