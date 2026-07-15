import type { MetadataRoute } from 'next'

// Web app manifest (NBD-15) — makes nabd installable. RTL, Arabic, standalone. The single SVG
// icon serves all sizes and doubles as a maskable icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'نبض · nabd',
    short_name: 'نبض',
    description: 'رفيقك اليوميّ للوِرد — صلاة وأذكار ونيّات ومحاسبة.',
    start_url: '/',
    display: 'standalone',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#f5f3ee',
    theme_color: '#0e5a5a',
    icons: [
      {
        src: '/icon.svg',
        type: 'image/svg+xml',
        sizes: 'any',
        purpose: 'any',
      },
      {
        src: '/icon.svg',
        type: 'image/svg+xml',
        sizes: 'any',
        purpose: 'maskable',
      },
    ],
  }
}
