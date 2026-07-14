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

export default withSerwist(nextConfig)
