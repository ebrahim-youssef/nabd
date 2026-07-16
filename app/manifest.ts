import type { MetadataRoute } from 'next'

// Web app manifest (NBD-15, icons NBD-35) — makes nabd installable. RTL, Arabic, standalone.
// PNG set generated from the brand mark (khatam + pulse); the maskable variants keep the motif
// inside the 80% safe zone, and the SVG scales for anything else.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'نبض · nabd',
    short_name: 'نبض',
    description: 'رفيقك اليوميّ للوِرد — صلاة وأذكار ونيّات ومحاسبة.',
    start_url: '/',
    display: 'standalone',
    dir: 'rtl',
    lang: 'ar',
    background_color: '#eaf2f0',
    theme_color: '#0e5a5a',
    icons: [
      {
        src: '/icons/icon-192.png',
        type: 'image/png',
        sizes: '192x192',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        type: 'image/png',
        sizes: '512x512',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192.png',
        type: 'image/png',
        sizes: '192x192',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512.png',
        type: 'image/png',
        sizes: '512x512',
        purpose: 'maskable',
      },
      {
        src: '/icon.svg',
        type: 'image/svg+xml',
        sizes: 'any',
        purpose: 'any',
      },
    ],
  }
}
