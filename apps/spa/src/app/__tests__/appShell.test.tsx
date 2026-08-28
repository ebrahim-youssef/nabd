import { beforeEach, describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import { ONBOARDING_COPY, shellCopy } from '@nabd/shared'

import { db } from '../../db/db'
import { renderApp } from '../../test/memoryApp'

describe('AppShell', () => {
  beforeEach(async () => {
    await db.wirdVersions.clear()
  })

  it('renders the shell with the fixed bottom navigation and gated index', async () => {
    renderApp('/app')

    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: shellCopy.appName })).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 2, name: ONBOARDING_COPY.title }),
    ).toBeInTheDocument()
  })

  it('adds a robots noindex meta while an app route is mounted', () => {
    renderApp('/app/settings')

    const meta = document.head.querySelector('meta[name="robots"]')
    expect(meta?.getAttribute('content')).toBe('noindex, nofollow')
  })
})
