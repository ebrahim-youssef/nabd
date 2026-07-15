// Canonical site constants used by metadata, the sitemap, robots, and the OG image. The URL is
// overridable per environment; the fallback is the intended production domain.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nabd.app'
export const SITE_NAME = 'نبض · nabd'
export const SITE_DESCRIPTION = 'رفيقك اليوميّ للوِرد — صلاة وأذكار ونيّات ومحاسبة.'
