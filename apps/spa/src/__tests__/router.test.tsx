import { beforeEach, describe, expect, it } from 'vitest'
import { act, screen, waitFor } from '@testing-library/react'

import { landingCopy, ONBOARDING_COPY, shellCopy } from '@nabd/shared'

import { db } from '../db/db'
import { renderApp } from '../test/memoryApp'

const NAV_SECTIONS: ReadonlyArray<readonly [string, string]> = [
  ['/app/libraries', shellCopy.nav.libraries],
  ['/app/prayer-times', shellCopy.nav.prayerTimes],
  ['/app/stats', shellCopy.nav.stats],
  ['/app/settings', shellCopy.nav.settings],
]

describe('application and public routing', () => {
  beforeEach(async () => {
    await db.wirdVersions.clear()
  })

  it('serves onboarding at the gated /app index', async () => {
    renderApp('/app')

    expect(
      await screen.findByRole('heading', { level: 2, name: ONBOARDING_COPY.title }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: shellCopy.appName })).toBeInTheDocument()
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument()
  })

  it('renders a placeholder with a sticky back header for each sub-navigation route', () => {
    for (const [path, title] of NAV_SECTIONS) {
      const { unmount } = renderApp(path)
      expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument()
      expect(screen.getByTestId('page-back')).toHaveAttribute('href', '/app')
      unmount()
    }
  })

  it('shows the application not-found inside the shell for unknown /app paths', () => {
    renderApp('/app/does-not-exist')

    expect(screen.getByText(shellCopy.notFound)).toBeInTheDocument()
    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument()
  })

  it('shows the public catch-all not-found outside the app shell', () => {
    renderApp('/totally-unknown')

    expect(screen.getByText(shellCopy.notFound)).toBeInTheDocument()
    expect(screen.queryByTestId('bottom-nav')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: shellCopy.returnLanding })).toHaveAttribute('href', '/')
  })

  it('restores the public landing and its metadata when leaving /app', async () => {
    const { router } = renderApp('/app/settings')

    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, nofollow',
    )

    await act(async () => router.navigate('/'))

    await waitFor(() => expect(document.head.querySelector('meta[name="robots"]')).toBeNull())
    expect(screen.getByRole('heading', { level: 1, name: landingCopy.tagline })).toBeInTheDocument()
  })
})
