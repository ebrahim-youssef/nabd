import { withSentryConfig } from '@sentry/nextjs'
import withSerwistInit from '@serwist/next'
import type { NextConfig } from 'next'

// The native (Capacitor) build is a static export bundled into the APK (ADR-0013): the whole
// app must exist as files on disk so the WebView boots with zero network. The web build on
// Vercel stays server-rendered and is unaffected by this flag.
const isNativeBuild = process.env.NEXT_PUBLIC_BUILD_TARGET === 'native'

// Response security headers for the server-rendered web build (audit F3). These are the
// unambiguous, framework-safe hardening headers; a strict nonce-based Content-Security-Policy
// is tracked as a follow-up (it needs env-specific connect-src + a request nonce and must be
// verified against the live deploy). `X-Frame-Options: DENY` already closes the clickjacking
// gap. Not emitted for the native export — `output: export` has no server to attach headers to.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  // Deny device capabilities the web app never uses; geolocation stays available to the app
  // itself (prayer-time location).
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)',
  },
]

const nextConfig: NextConfig = isNativeBuild
  ? {
      output: 'export',
      // The export target has no image-optimizer server; this keeps any future next/image
      // usage from breaking the native build.
      images: { unoptimized: true },
    }
  : {
      async headers() {
        return [{ source: '/:path*', headers: securityHeaders }]
      },
    }

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
