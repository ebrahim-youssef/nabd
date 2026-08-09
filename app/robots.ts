import type { MetadataRoute } from 'next'

// Required for the native static export (ADR-0013); the route is static on web anyway.
export const dynamic = 'force-static'

import { SITE_URL } from '@/lib/site'

// /robots.txt (NBD-14). Allow crawling everything except the auth callback plumbing, and point
// crawlers at the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/auth/',
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
