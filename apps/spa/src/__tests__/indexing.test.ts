import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const NOINDEX_DIRECTIVE = 'X-Robots-Tag: noindex, nofollow'

async function readHeaderRules() {
  const headers = await readFile(resolve(process.cwd(), 'public/_headers'), 'utf8')
  return headers.split(/\r?\n\r?\n/).filter(Boolean)
}

describe('search-indexing boundary', () => {
  it('disallows the application namespace in robots.txt', async () => {
    const robots = await readFile(resolve(process.cwd(), 'public/robots.txt'), 'utf8')

    expect(robots).toContain('Disallow: /app/')
    expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/)
  })

  it('lists only the public landing in the sitemap', async () => {
    const sitemap = await readFile(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8')

    expect(sitemap).not.toContain('/app')
    expect(sitemap.match(/<loc>/g)).toHaveLength(1)
  })

  // The SPA fallback answers every unmatched path with the same 200 document, so enumerating
  // application prefixes would leave arbitrary soft-404 paths indexable. The boundary is stated
  // the other way round: noindex everything, then detach it for the one public route.
  it('marks every served path noindex by default', async () => {
    const rules = await readHeaderRules()
    const globalRule = rules.find((rule) => rule.startsWith('/*\n'))

    expect(globalRule).toBeDefined()
    expect(globalRule).toContain(NOINDEX_DIRECTIVE)
  })

  it('detaches the noindex directive for the public landing route only', async () => {
    const rules = await readHeaderRules()
    const landingRule = rules.find((rule) => rule.startsWith('/\n'))

    expect(landingRule).toBeDefined()
    expect(landingRule).toContain('! X-Robots-Tag')
    expect(rules.filter((rule) => rule.includes('! X-Robots-Tag'))).toHaveLength(1)
  })

  it('declares unambiguous security headers globally', async () => {
    const rules = await readHeaderRules()
    const globalRule = rules.find((rule) => rule.startsWith('/*\n'))

    expect(globalRule).toBeDefined()
    expect(globalRule).toContain('X-Frame-Options: DENY')
    expect(globalRule).toContain('X-Content-Type-Options: nosniff')
    expect(globalRule).toContain('Referrer-Policy: strict-origin-when-cross-origin')
    expect(globalRule).toContain('Strict-Transport-Security: max-age=63072000; includeSubDomains')
    expect(globalRule).toContain(
      'Permissions-Policy: camera=(), microphone=(), payment=(), usb=(), geolocation=(self)',
    )
  })
})
