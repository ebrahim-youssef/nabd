import type { MetadataRoute } from 'next'

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
  ]
}
