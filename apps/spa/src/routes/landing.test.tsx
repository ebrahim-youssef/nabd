import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { landingCopy, SITE_URL } from '@nabd/shared'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LandingPage } from './landing'
import { injectSiteMetadata } from '../../site-metadata'

describe('LandingPage', () => {
  it('renders the shared landing copy and every value proposition', () => {
    render(<LandingPage />)

    expect(screen.getByRole('heading', { level: 1, name: landingCopy.tagline })).toBeInTheDocument()
    expect(screen.getAllByText(landingCopy.appName).length).toBeGreaterThan(0)
    expect(screen.getByText(landingCopy.description)).toBeInTheDocument()

    for (const valueProp of landingCopy.valueProps) {
      expect(screen.getByText(valueProp)).toBeInTheDocument()
    }
  })
})

describe('landing document metadata', () => {
  it('declares Arabic RTL document semantics and complete search metadata', async () => {
    const indexHtml = injectSiteMetadata(
      await readFile(resolve(process.cwd(), 'index.html'), 'utf8'),
    )
    const documentNode = new DOMParser().parseFromString(indexHtml, 'text/html')

    expect(documentNode.documentElement.lang).toBe('ar')
    expect(documentNode.documentElement.dir).toBe('rtl')
    expect(documentNode.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      landingCopy.description,
    )
    expect(documentNode.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      new URL('/', SITE_URL).toString(),
    )
    expect(documentNode.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(
      `${landingCopy.appName} — ${landingCopy.tagline}`,
    )
    expect(
      documentNode.querySelector('meta[property="og:description"]')?.getAttribute('content'),
    ).toBe(landingCopy.description)
    expect(documentNode.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe(
      new URL('/og-image.png', SITE_URL).toString(),
    )
    expect(documentNode.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe(
      'summary_large_image',
    )
  })

  it('generates crawler metadata from the shared site URL', async () => {
    const [robots, sitemap] = await Promise.all([
      readFile(resolve(process.cwd(), 'public/robots.txt'), 'utf8'),
      readFile(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8'),
    ])

    expect(robots).toContain(`Sitemap: ${new URL('/sitemap.xml', SITE_URL).toString()}`)
    expect(robots).toContain('Disallow: /app/')
    expect(sitemap).toContain(`<loc>${new URL('/', SITE_URL).toString()}</loc>`)
  })
})
