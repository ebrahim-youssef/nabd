import type { MetadataRoute } from 'next'

// Required for the native static export (ADR-0013); the route is static on web anyway.
export const dynamic = 'force-static'

import { SITE_URL } from '@/lib/site'

// /sitemap.xml (NBD-14). Lists the public, indexable routes. Grows as public pages are added
// (adhkar/intentions libraries, etc.).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/libraries`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/adhkar`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/niyyat`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/prayer-times`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]
}
